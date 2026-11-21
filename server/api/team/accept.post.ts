import { readValidatedBody } from "h3";
import { z } from "zod";
import { requireAuthUser } from "../../utils/auth";
import { getUserClient } from "../../utils/supabase";
import { hashInviteToken, teamError } from "../../utils/team";

const bodySchema = z.object({
  token: z.string().trim().min(10).max(200),
  name: z.string().trim().max(120).optional(),
});

/**
 * Join a business with an invitation. The database checks that the signed-in
 * email is the one the invitation was sent to.
 */
export default defineEventHandler(async (event) => {
  const authUser = await requireAuthUser(event);
  const { token, name } = await readValidatedBody(event, bodySchema.parse);
  const sb = await getUserClient(event);
  const { data, error } = await sb.rpc("accept_business_invitation", { p_token_hash: hashInviteToken(token) });
  if (error) throw teamError(error);
  if (name) {
    const [first, ...rest] = name.split(/\s+/).filter(Boolean);
    await sb.from("profiles").upsert({ id: authUser.id, first_name: first ?? "", last_name: rest.join(" ") }, { onConflict: "id" });
  }
  return data;
});
