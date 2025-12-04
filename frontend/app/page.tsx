import { redirect } from "next/navigation";

export default function Page() {
  // Redirect root to the Upload page we added
  redirect("/upload");
}
