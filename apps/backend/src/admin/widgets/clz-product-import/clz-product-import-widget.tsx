import { defineWidgetConfig } from "@medusajs/admin-sdk";
import {
  Container,
  Heading,
  Button,
  Drawer,
  Input,
  toast,
  Alert,
} from "@medusajs/ui";
import { ArrowDownTray } from "@medusajs/icons";
import { useState, useRef } from "react";
import { sdk } from "../../lib/client";


export const config = defineWidgetConfig({
  zone: "product.list.before",
});

const formatTime = (seconds: number): string => {
  if (seconds <= 0) return "Finishing...";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s remaining`;
  if (m > 0) return `${m}m ${s}s remaining`;
  return `${s}s remaining`;
};

const CLZImportWidget = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [timeEstimate, setTimeEstimate] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const isCancelled = useRef(false);
  const startTimeRef = useRef<number>(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const cancelImport = () => {
    isCancelled.current = true;
    setUploading(false);
    setProgress(0);
    setTimeEstimate("");
    toast.info("Import cancelled");
  };

  const createHandle = (
    series: string,
    issue: string = "",
    year: string = "",
  ) => {
    let handle = `${series} ${issue} ${year}`.toLowerCase();
    handle = handle
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return handle.length > 3
      ? handle
      : `${handle}-${Date.now().toString().slice(-6)}`;
  };

  const optimizeAndUploadImage = async (
    externalUrl: string,
  ): Promise<string | null> => {
    try {
      const proxyUrl = `/image-proxy?url=${encodeURIComponent(externalUrl)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error("Proxy failed");

      const blob = await response.blob();
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
      });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const MAX_WIDTH = 1200;
      let { width, height } = img;
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      const optimizedBlob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/webp", 0.85),
      );

      const optimizedFile = new File(
        [optimizedBlob],
        `clz-${Date.now()}.webp`,
        { type: "image/webp" },
      );

      const uploadResult = await sdk.admin.upload.create({
        files: [optimizedFile],
      });
      return uploadResult.files?.[0]?.url || null;
    } catch (err) {
      console.error("Image upload failed", err);
      return null;
    }
  };

  const parseCLZXml = async (xmlFile: File) => {
    const text = await xmlFile.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");
    const nodes = xmlDoc.getElementsByTagName("comic");
    const comics: any[] = [];

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      comics.push({
        series_name: n
          .getElementsByTagName("displayname")[0]
          ?.textContent?.trim(),
        issue_title: n.getElementsByTagName("title")[0]?.textContent?.trim(),
        issue_subtitle: n
          .getElementsByTagName("subtitle")[0]
          ?.textContent?.trim(),
        issue_number: n.getElementsByTagName("issuenr")[0]?.textContent?.trim(),
        issue_year: n.getElementsByTagName("year")[0]?.textContent?.trim(),
        variant_description: n
          .getElementsByTagName("edition")[0]
          ?.textContent?.trim(),
        grade: n.getElementsByTagName("grade")[0]?.textContent?.trim(),
        notes: n.getElementsByTagName("notes")[0]?.textContent?.trim(),
        is_signed: n.getElementsByTagName("signed")[0]?.textContent?.trim(),
        coverfrontdefault: n
          .getElementsByTagName("coverfrontdefault")[0]
          ?.textContent?.trim(),
        covrprice: n.getElementsByTagName("coverprice")[0]?.textContent?.trim(),
      });
    }
    return comics.filter((c) => c.series_name);
  };

  const processComics = async (comics: any[]) => {
    let successCount = 0;
    let duplicateCount = 0;
    const newErrors: string[] = [];
    startTimeRef.current = Date.now();

    let stockLocationId: string | null = null;
    try {
      const locations = await sdk.admin.stockLocation.list({ limit: 1 });
      if (locations.stock_locations?.length > 0) {
        stockLocationId = locations.stock_locations[0].id;
      }
    } catch (e) {
      console.warn("Could not fetch stock location");
    }

    if (!stockLocationId) {
      toast.error(
        "No stock location found. Please create one in Settings → Stock Locations first.",
      );
      return;
    }

    for (let i = 0; i < comics.length; i++) {
      if (isCancelled.current) break;

      const c = comics[i];
      const series = (c.series_name || "").trim();
      const year = c.issue_year ? ` (${c.issue_year})` : "";
      const issueTitle = (c.issue_title || "").trim();
      const issueSubtitle = (c.issue_subtitle || "").trim();
      const issueEdition = (c.variant_description || "").trim();
      const issueNumber = ("#" + c.issue_number || "").trim();

      const title = `${series} ${issueNumber} ${issueEdition} ${year}`;
      const priceStr = (c.covrprice || "TBA").trim();
      const priceAmount = parseFloat(priceStr) || 0;
      const handle = createHandle(
        series,
        c.issue_number || "",
        c.issue_year || "",
      );

      let thumbnailUrl = null;
      if (c.coverfrontdefault) {
        thumbnailUrl = await optimizeAndUploadImage(c.coverfrontdefault);
      }

      try {
        // Check for existing product
        const existing = await sdk.admin.product.list({
          handle,
          limit: 1,
          fields: "+variants.inventory_items.inventory_item_id",
        });

        if (existing.products && existing.products.length > 0) {
          // DUPLICATE → increment inventory
          const existingProduct = existing.products[0];
          const existingVariant = existingProduct.variants?.[0];
          const inventoryItemId =
            existingVariant?.inventory_items?.[0]?.inventory_item_id;

          if (inventoryItemId && stockLocationId) {
            try {
              const levelsRes =
                await sdk.admin.inventoryItem.listLevels(inventoryItemId);
              const currentQty =
                levelsRes?.inventory_levels?.[0]?.stocked_quantity || 0;

              await sdk.admin.inventoryItem.updateLevel(
                inventoryItemId,
                stockLocationId,
                { stocked_quantity: currentQty + 1 },
              );
              console.log(
                `📦 Incremented inventory: ${title} → ${currentQty + 1}`,
              );
            } catch (invErr: any) {
              newErrors.push(
                `${title}: Inventory update failed - ${invErr?.message || "Unknown"}`,
              );
            }
          } else {
            console.warn(`📦 Duplicate but no inventory_items: ${title}`);
          }
          duplicateCount++;
        } else {
          // NEW PRODUCT
          const productData: any = {
            title,
            handle,
            description: `Grade: ${c.grade || "N/A"}\nCovrPrice Value: $${priceStr}\nPurchase Price: $${c.purchase_price || "0.00"}\nSigned: ${c.is_signed === "true" ? "Yes" : "No"}\n\nNotes: ${c.notes || ""}`,
            metadata: {
              source: "CLZ XML",
              grade: c.grade,
              covrprice_value: c.value,
              covrprice_id: c.covrprice_id,
            },
            options: [{ title: "Variant", values: ["Default"] }],
            variants: [
              {
                title: "Default",
                sku: c.covrprice_id || `CLZ-${Date.now()}`,
                prices: [{ amount: priceAmount, currency_code: "eur" }],
                manage_inventory: true,
              },
            ],
          };
          const result = await sdk.admin.product.create(productData);

          const fullProduct = await sdk.admin.product.retrieve(
            result.product.id,
            {
              fields: "+variants.inventory_items.inventory_item_id",
            },
          );

          if (thumbnailUrl) {
            await sdk.admin.product.update(result.product.id, {
              thumbnail: thumbnailUrl,
              images: [{ url: thumbnailUrl }],
            });
          }

          // === NEW: Use createLocationLevel for first-time inventory ===
          const newVariant = fullProduct.product.variants?.[0];
          const inventoryItemId =
            newVariant?.inventory_items?.[0]?.inventory_item_id;

          if (inventoryItemId && stockLocationId) {
            try {
              await sdk.admin.inventoryItem.batchInventoryItemLocationLevels(
                inventoryItemId,
                {
                  create: [
                    {
                      location_id: stockLocationId,
                      stocked_quantity: 1,
                    },
                  ],
                },
              );
              console.log(`✅ Inventory level created (qty=1): ${title}`);
            } catch (invErr: any) {
              newErrors.push(
                `${title}: Failed to create initial inventory - ${invErr?.message || "Unknown"}`,
              );
            }
          }

          successCount++;
        }
      } catch (err: any) {
        newErrors.push(`${title}: ${err?.message || "Unknown error"}`);
      }

      // Progress update...
      const currentProgress = Math.round(((i + 1) / comics.length) * 100);
      setProgress(currentProgress);
      setProcessed(i + 1);
      setTotal(comics.length);

      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const avg = elapsed / (i + 1);
      const remaining = Math.ceil(avg * (comics.length - i - 1));
      setTimeEstimate(formatTime(remaining));
    }

    if (newErrors.length > 0) setErrors((prev) => [...prev, ...newErrors]);
    if (!isCancelled.current) {
      toast.success(
        `✅ ${successCount} new comics • 📦 Updated inventory for ${duplicateCount} duplicates`,
      );
    }
  };

  const handleUpload = async () => {
    if (!file) return toast.error("Please select a CLZ XML file");

    setUploading(true);
    setProgress(0);
    setTimeEstimate("");
    setErrors([]);
    isCancelled.current = false;

    try {
      const comics = await parseCLZXml(file);
      if (comics.length === 0) return toast.error("No comics found in XML");
      await processComics(comics);
    } catch (e) {
      toast.error("Failed to process XML file");
      console.error(e);
    } finally {
      setUploading(false);
      setFile(null);
      setTimeEstimate("");
    }
  };

  return (
    <Container className="p-0 mb-6 divide-y">
      <div className="flex justify-between items-center py-4 px-6">
        <Heading level="h2">CLZ XML Import</Heading>

        <Drawer>
          <Drawer.Trigger asChild>
            <Button variant="secondary" size="small">
              <ArrowDownTray className="mr-2" />
              Import CLZ XML
            </Button>
          </Drawer.Trigger>

          <Drawer.Content>
            <Drawer.Header>
              <Drawer.Title>Import CLZ XML with Cover Images</Drawer.Title>
            </Drawer.Header>

            <div className="p-6 space-y-6">
              <Input type="file" accept=".xml" onChange={handleFileChange} />

              {file && (
                <p>
                  Selected: <strong>{file.name}</strong>
                </p>
              )}

              {uploading && (
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Importing comics...</span>
                    <span>
                      {progress}% • {timeEstimate}
                    </span>
                  </div>
                  <div className="overflow-hidden w-full h-2 rounded bg-ui-bg-component">
                    <div
                      className="h-full transition-all duration-300 bg-ui-fg-interactive"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-center text-ui-fg-subtle">
                    {processed} of {total} comics
                  </p>

                  <Button
                    variant="secondary"
                    size="small"
                    onClick={cancelImport}
                  >
                    Cancel Import
                  </Button>
                </div>
              )}

              {errors.length > 0 && (
                <Alert variant="error">
                  <strong>Some comics failed:</strong>
                  <ul className="overflow-auto mt-2 max-h-40 text-xs">
                    {errors.slice(0, 8).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </Alert>
              )}
            </div>

            <Drawer.Footer>
              <Drawer.Close asChild>
                <Button variant="secondary" disabled={uploading}>
                  Close
                </Button>
              </Drawer.Close>
              <Button
                onClick={handleUpload}
                isLoading={uploading}
                disabled={!file || uploading}
              >
                Start Import
              </Button>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer>
      </div>
    </Container>
  );
};

export default CLZImportWidget;
