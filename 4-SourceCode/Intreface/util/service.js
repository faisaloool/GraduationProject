export async function fetchUserData() {
  const res = await fetch("quizai/user/data");
  if (!res.ok) throw new Error("Failed to fetch user data");
  return res.json();
}
