// src/admin/widgets/bulk-actions-widget.tsx
import { defineWidgetConfig } from "@medusajs/admin-sdk";
import {
  Container,
  Heading,
  Button,
  Checkbox,
  toast,
  Alert,
  Select,
  Tabs,
} from "@medusajs/ui";
import { Trash, PencilSquare } from "@medusajs/icons";
import { useState, useEffect, useRef } from "react";
import Medusa from "@medusajs/js-sdk";

const sdk = new Medusa({
  baseUrl: import.meta.env.VITE_MEDUSA_BACKEND_URL || "http://localhost:9000",
  debug: import.meta.env.DEV,
  auth: { type: "session" },
});

export const config = defineWidgetConfig({
  zone: "product.list.after",
});

const statusOptions = [
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
];

const formatTime = (seconds: number): string => {
  if (seconds <= 0) return "Finishing...";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s remaining`;
  if (m > 0) return `${m}m ${s}s remaining`;
  return `${s}s remaining`;
};

const BulkActionsWidget = () => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "delete">("edit");

  // Edit State
  const [newStatus, setNewStatus] = useState<"published" | "draft">(
    "published",
  );
  const [editing, setEditing] = useState(false);
  const [editProgress, setEditProgress] = useState(0);
  const [editTimeEstimate, setEditTimeEstimate] = useState("");

  // Delete State
  const [deleting, setDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [deleteTimeEstimate, setDeleteTimeEstimate] = useState("");
  const [currentItem, setCurrentItem] = useState("");

  const isCancelled = useRef(false);
  const startTimeRef = useRef<number>(0);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await sdk.admin.product.list({
          limit: 200,
          fields: "id,title,handle,status",
        });
        setProducts(res.products || []);
      } catch (err) {
        toast.error("Failed to load products");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map((p) => p.id));
    }
  };

  // ==================== BULK EDIT (FIXED) ====================
  const handleBulkEdit = async () => {
    if (selectedIds.length === 0) return;

    if (
      !confirm(
        `Change status of ${selectedIds.length} products to "${newStatus}"?`,
      )
    )
      return;

    setEditing(true);
    setEditProgress(0);
    setEditTimeEstimate("");
    isCancelled.current = false;
    startTimeRef.current = Date.now();
    let successCount = 0;

    for (let i = 0; i < selectedIds.length; i++) {
      if (isCancelled.current) break;

      const id = selectedIds[i];
      const product = products.find((p) => p.id === id);
      setCurrentItem(product?.title || id);

      try {
        // ✅ Correct way to update product status
        await sdk.admin.product.update(id, {
          status: newStatus,
        });
        successCount++;
      } catch (err: any) {
        console.error(`Failed to update ${id}:`, err);
        toast.error(`Failed to update: ${product?.title}`);
      }

      const prog = Math.round(((i + 1) / selectedIds.length) * 100);
      setEditProgress(prog);

      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const avg = elapsed / (i + 1);
      const remaining = Math.ceil(avg * (selectedIds.length - i - 1));
      setEditTimeEstimate(formatTime(remaining));
    }

    toast.success(`✅ Updated ${successCount} products to ${newStatus}`);

    // Refresh product list
    try {
      const res = await sdk.admin.product.list({
        limit: 100,
        fields: "id,title,handle,status",
      });
      setProducts(res.products || []);
    } catch (e) { }

    setSelectedIds([]);
    setEditing(false);
    setEditProgress(0);
    setEditTimeEstimate("");
    setCurrentItem("");
  };

  // ==================== BULK DELETE ====================
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    if (
      !confirm(
        `DELETE ${selectedIds.length} products permanently? This cannot be undone.`,
      )
    )
      return;

    setDeleting(true);
    setDeleteProgress(0);
    setDeleteTimeEstimate("");
    isCancelled.current = false;
    startTimeRef.current = Date.now();
    let successCount = 0;

    for (let i = 0; i < selectedIds.length; i++) {
      if (isCancelled.current) break;

      const id = selectedIds[i];
      const product = products.find((p) => p.id === id);
      setCurrentItem(product?.title || id);

      try {
        await sdk.admin.product.delete(id);
        successCount++;
      } catch (err: any) {
        console.error(`Failed to delete ${id}:`, err);
      }

      const prog = Math.round(((i + 1) / selectedIds.length) * 100);
      setDeleteProgress(prog);

      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const avg = elapsed / (i + 1);
      const remaining = Math.ceil(avg * (selectedIds.length - i - 1));
      setDeleteTimeEstimate(formatTime(remaining));
    }

    toast.success(`✅ Deleted ${successCount} products`);

    // Refresh list
    try {
      const res = await sdk.admin.product.list({
        limit: 100,
        fields: "id,title,handle,status",
      });
      setProducts(res.products || []);
    } catch (e) { }

    setSelectedIds([]);
    setDeleting(false);
    setDeleteProgress(0);
    setDeleteTimeEstimate("");
    setCurrentItem("");
  };

  const cancelAction = () => {
    isCancelled.current = true;
    setEditing(false);
    setDeleting(false);
    setEditProgress(0);
    setDeleteProgress(0);
    setEditTimeEstimate("");
    setDeleteTimeEstimate("");
    toast.info("Operation cancelled");
  };

  return (
    <Container className="p-0 mb-6 divide-y">
      <div className="flex justify-between items-center py-4 px-6">
        <Heading level="h2">Bulk Actions</Heading>

        <Button
          variant="secondary"
          size="small"
          onClick={selectAll}
          disabled={editing || deleting}
        >
          {selectedIds.length === products.length && products.length > 0
            ? "Deselect All"
            : `Select All (${products.length})`}
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "edit" | "delete")}
      >
        <Tabs.List className="px-6">
          <Tabs.Trigger value="edit">Bulk Edit Status</Tabs.Trigger>
          <Tabs.Trigger value="delete">Bulk Delete</Tabs.Trigger>
        </Tabs.List>

        {/* EDIT TAB */}
        <Tabs.Content value="edit" className="p-6 space-y-6">
          <div className="flex gap-4 items-center">
            <span className="text-sm font-medium">New Status:</span>
            <Select
              value={newStatus}
              onValueChange={(v) => setNewStatus(v as "published" | "draft")}
            >
              <Select.Trigger className="w-40">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {statusOptions.map((opt) => (
                  <Select.Item key={opt.value} value={opt.value}>
                    {opt.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>

          <div className="overflow-auto rounded border max-h-[400px]">
            {products.map((p) => (
              <div
                key={p.id}
                className="flex gap-x-3 items-center py-3 px-4 border-b hover:bg-ui-bg-subtle"
              >
                <Checkbox
                  checked={selectedIds.includes(p.id)}
                  onCheckedChange={() => toggleSelect(p.id)}
                  disabled={editing || deleting}
                />
                <div className="flex-1">
                  <p className="font-medium truncate">{p.title}</p>
                  <p className="text-sm text-ui-fg-subtle">/{p.handle}</p>
                </div>
                <span className="text-sm capitalize text-ui-fg-subtle">
                  {p.status}
                </span>
              </div>
            ))}
          </div>

          <Button
            onClick={handleBulkEdit}
            disabled={selectedIds.length === 0 || editing}
            isLoading={editing}
            variant="primary"
          >
            <PencilSquare className="mr-2" />
            Update Status of {selectedIds.length} Products
          </Button>
        </Tabs.Content>

        {/* DELETE TAB */}
        <Tabs.Content value="delete" className="p-6 space-y-6">
          <div className="overflow-auto rounded border max-h-[400px]">
            {products.map((p) => (
              <div
                key={p.id}
                className="flex gap-x-3 items-center py-3 px-4 border-b hover:bg-ui-bg-subtle"
              >
                <Checkbox
                  checked={selectedIds.includes(p.id)}
                  onCheckedChange={() => toggleSelect(p.id)}
                  disabled={editing || deleting}
                />
                <div className="flex-1">
                  <p className="font-medium truncate">{p.title}</p>
                  <p className="text-sm text-ui-fg-subtle">/{p.handle}</p>
                </div>
              </div>
            ))}
          </div>

          <Button
            onClick={handleBulkDelete}
            disabled={selectedIds.length === 0 || deleting}
            isLoading={deleting}
            variant="danger"
          >
            <Trash className="mr-2" />
            Delete {selectedIds.length} Products
          </Button>
        </Tabs.Content>
      </Tabs>

      {/* Progress Area */}
      {(editing || deleting) && (
        <div className="p-6 border-t bg-ui-bg-subtle">
          <div className="flex justify-between mb-2 text-sm">
            <span>
              {editing ? "Updating status..." : "Deleting products..."}
            </span>
            <span>
              {editing ? editProgress : deleteProgress}% •{" "}
              {editing ? editTimeEstimate : deleteTimeEstimate}
            </span>
          </div>
          <div className="overflow-hidden mb-3 w-full h-2 rounded bg-ui-bg-component">
            <div
              className="h-full transition-all duration-300 bg-ui-fg-interactive"
              style={{ width: `${editing ? editProgress : deleteProgress}%` }}
            />
          </div>
          {currentItem && (
            <p className="text-sm text-ui-fg-subtle">
              Current: <strong>{currentItem}</strong>
            </p>
          )}

          <Button
            variant="secondary"
            size="small"
            onClick={cancelAction}
            className="mt-3"
          >
            Cancel Operation
          </Button>
        </div>
      )}
    </Container>
  );
};

export default BulkActionsWidget;
