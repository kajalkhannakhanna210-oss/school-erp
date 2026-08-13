"use server";

export async function submitContactMessage(input: { name: string; email: string; phone: string; message: string }) {
  void input;
  return { error: "Please submit the contact form from the website." };
}
