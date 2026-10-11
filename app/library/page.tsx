import { redirect } from "next/navigation";

/** The Library tab was renamed Bookmarks. */
export default function LibraryRedirect() {
  redirect("/bookmarks");
}
