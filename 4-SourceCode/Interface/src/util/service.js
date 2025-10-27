const API_URL = "https://0befc81c-b05a-4c91-97dc-febeb4033999.mock.pstmn.io";

export async function loginUser(email, password) {
  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function registerUser(name, email, password) {
  const res = await fetch(`${API_URL}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  return res.json();
}

export async function fetchUserExams(userId, token) {
  try {
    const response = await fetch(`${API_URL}/users/${userId}/exams`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch exams");
    }

    const data = await response.json();
    return data; // return exams list
  } catch (error) {
    console.error("Error fetching user exams:", error);
    return []; // return empty array if something goes wrong
  }
}
