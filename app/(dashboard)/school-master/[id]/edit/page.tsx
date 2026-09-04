import { redirect } from "next/navigation";

/** Compatibility redirect: school editing now uses the prefilled New School form. */
export default function EditSchoolRedirect({ params }: { params: { id: string } }) {
  redirect(`/school-master/new?id=${params.id}`);
}
