import { Container, Heading, Button, toast } from "@medusajs/ui";
import { useMutation } from "@tanstack/react-query";
import { sdk } from "../../../lib/client.ts";
import { defineRouteConfig } from "@medusajs/admin-sdk";

const MeilisearchPage = () => {
  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      sdk.client.fetch("/admin/meilisearch/sync", {
        method: "POST",
      }),
    onSuccess: () => {
      toast.success("Successfully triggered data sync to Meilisearch");
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to sync data to Meilisearch");
    },
  });

  const handleSync = () => {
    mutate();
  };

  return (
    <Container className="p-0 divide-y">
      <div className="flex justify-between items-center py-4 px-6">
        <Heading level="h2">Meilisearch Sync</Heading>
      </div>
      <div className="py-8 px-6">
        <Button variant="primary" onClick={handleSync} isLoading={isPending}>
          Sync Data to Meilisearch
        </Button>
      </div>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "Meilisearch",
});

export default MeilisearchPage;
