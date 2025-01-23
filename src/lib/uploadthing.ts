import { createUploadthing, type FileRouter } from "uploadthing/next";
import { generateReactHelpers } from "@uploadthing/react";

const uploadthing = createUploadthing();

interface FileMetadata {
  userId: string;
}

interface FileResponse {
  url: string;
}

export const ourFileRouter = {
  messageAttachment: uploadthing(["image", "pdf", "audio"])
    .middleware(async () => {
      return { userId: "test" };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("File URL:", file.url);
      
      return { success: true };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

export const { useUploadThing } = generateReactHelpers<OurFileRouter>(); 