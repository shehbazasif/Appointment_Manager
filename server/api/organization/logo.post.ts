import { requireTenant, serializeBusiness } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";

const MAX_BYTES = 2 * 1024 * 1024; // must match the bucket's file_size_limit

/**
 * Business logo upload. The client has already cropped/center-cropped and
 * resized the image to a square PNG/JPEG — this endpoint validates the bytes,
 * uploads to Supabase Storage (user's own folder, enforced by RLS), makes the
 * URL the business's logo, and cleans up older uploads.
 */
export default defineEventHandler(async (event) => {
  const tenant = await requireTenant(event);
  const sb = await getUserClient(event);

  const form = await readMultipartFormData(event);
  if (!form?.length) {
    throw createError({ statusCode: 400, statusMessage: "No file uploaded." });
  }

  const file = form.find((p) => p.name === "file");
  if (!file?.data?.length) {
    throw createError({ statusCode: 400, statusMessage: "No file uploaded." });
  }
  if (file.data.length > MAX_BYTES) {
    throw createError({ statusCode: 413, statusMessage: "Image is too large (max 2 MB)." });
  }

  const type = file.type ?? "";
  const isPng = type === "image/png";
  const isJpeg = type === "image/jpeg";
  // Magic-byte sniffing so a mislabeled upload can't sneak past the bucket's MIME allow-list.
  const isPngMagic =
    file.data[0] === 0x89 && file.data[1] === 0x50 && file.data[2] === 0x4e && file.data[3] === 0x47;
  const isJpegMagic = file.data[0] === 0xff && file.data[1] === 0xd8 && file.data[2] === 0xff;
  if (!isPng && !isJpeg && !isPngMagic && !isJpegMagic) {
    throw createError({
      statusCode: 415,
      statusMessage: "Only PNG or JPEG images are allowed.",
    });
  }

  const contentType = isPngMagic && !isJpegMagic ? "image/png" : isJpegMagic ? "image/jpeg" : type;
  const ext = contentType === "image/png" ? "png" : "jpg";
  // Stable path: one object per business, overwritten on each upload. The
  // first path segment must be the uploader's uid (storage RLS requirement).
  const path = `${tenant.userId}/business-${tenant.businessId}.${ext}`;

  const { error: uploadError } = await sb.storage
    .from("business-logos")
    .upload(path, file.data, {
      contentType,
      upsert: true,
    });
  if (uploadError) {
    throw createError({
      statusCode: 500,
      statusMessage: `Upload failed: ${uploadError.message}`,
    });
  }

  const { data: publicUrlData } = sb.storage.from("business-logos").getPublicUrl(path);
  const publicUrl = publicUrlData?.publicUrl;
  if (!publicUrl) {
    throw createError({ statusCode: 500, statusMessage: "Could not resolve the uploaded logo URL." });
  }

  const { data: updated, error: updateError } = await sb
    .from("businesses")
    .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", tenant.businessId)
    .select()
    .single();
  if (updateError || !updated) {
    throw createError({
      statusCode: 500,
      statusMessage: updateError?.message ?? "Could not attach the logo to your business.",
    });
  }

  return serializeBusiness(updated, tenant.settings);
});
