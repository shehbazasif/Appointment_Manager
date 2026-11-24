import { readValidatedBody } from "h3";
import { z } from "zod";
import { requireHeadOffice } from "../../utils/auth";
import { getAnonClient, getUserClient } from "../../utils/supabase";

const bodySchema = z.object({ password: z.string().min(1, "Enter your password.").max(200) });

/**
 * Head office: delete a branch and everything in it. The person types their
 * password again first, so an open, unattended dashboard cannot do it.
 */
export default defineEventHandler(async (event) => {
  const { homeBusiness, email } = await requireHeadOffice(event);
  const id = getRouterParam(event, "id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) throw createError({ statusCode: 400, statusMessage: "Branch id is required." });
  const { password } = await readValidatedBody(event, bodySchema.parse);
  const sb = await getUserClient(event);

  // must be one of this head office's branches
  const { data: branch } = await sb
    .from("businesses")
    .select("id, name")
    .eq("id", id)
    .eq("parent_business_id", homeBusiness.id)
    .maybeSingle();
  if (!branch) throw createError({ statusCode: 404, statusMessage: "Branch not found." });

  // check the password with a separate, throw-away sign-in (this browser's
  // session is not touched; the extra session is closed straight away)
  const check = getAnonClient();
  const { error: pwError } = await check.auth.signInWithPassword({ email, password });
  if (pwError) {
    const tooMany = /rate|too many/i.test(pwError.message ?? "");
    throw createError({
      statusCode: tooMany ? 429 : 403,
      statusMessage: tooMany ? "Too many tries. Wait a few minutes and try again." : "Wrong password.",
    });
  }
  await check.auth.signOut({ scope: "local" }).catch(() => null);

  const { data, error } = await sb.rpc("delete_branch", { p_branch_id: id });
  if (error)
    throw createError({
      statusCode: error.code === "42501" ? 403 : error.code === "P0002" ? 404 : 500,
      statusMessage: error.message,
    });
  return data;
});
