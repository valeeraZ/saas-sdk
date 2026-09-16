import { getSaasTenant } from "@saas-platform/sdk/tenant-next";
import { SaasTenantLink } from "@saas-platform/sdk/tenant-react";
import { saveNote } from "./actions";
import { db } from "../../../../../../db";
import ApiButton from "./api-button";
export default async function Notes() {
  const context = await getSaasTenant();
  if (!context.roles.includes("viewer")) throw new Error("Not authorized");
  const notes = await db.query(
    "SELECT body FROM sdk_notes WHERE app_id=$1 AND tenant_id=$2 ORDER BY id",
    [context.appId, context.tenantId],
  );
  return (
    <>
      <h1>租户记录</h1>
      <p>{context.tenantId}</p>
      <SaasTenantLink href="/">应用首页</SaasTenantLink>
      <form action={saveNote}>
        <label>
          记录内容
          <input name="body" maxLength={200} required />
        </label>
        <button>保存 Server Action</button>
      </form>
      <ApiButton />
      <ul>
        {notes.rows.map((note, index) => (
          <li key={index}>{note.body}</li>
        ))}
      </ul>
    </>
  );
}
