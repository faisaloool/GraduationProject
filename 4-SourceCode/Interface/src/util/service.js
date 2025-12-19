const API_URL = "https://d58837bb-c348-4ce4-9768-3b480c517aba.mock.pstmn.io";
const API_URL2 = "https://382050f1-d285-4eac-93a7-adf0c0e0ef1f.mock.pstmn.io";
//old one with limtited urls const API_URL = "https://0befc81c-b05a-4c91-97dc-febeb4033999.mock.pstmn.io";

export async function loginUser(email, password) {
  const res = await fetch(`${API_URL}/quiz-ai/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function registerUser(name, email, password) {
  const res = await fetch(`${API_URL}/quiz-ai/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  return res.json();
}

export async function fetchUserExams(userId, token) {
  try {
    const response = await fetch(`${API_URL}/quiz-ai/users/${userId}/exams`, {
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

export async function generateQuizFromFile(file, token) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL2}/quiz-ai/quiz/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  return res.json();
}

export async function verifyCode(code, email) {
  try {
    const response = await fetch(`${API_URL}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code, email }),
    });
    const result = await response.json();
    if (response.ok) {
      // Handle successful verification
      return result;
    } else {
      // Handle verification failure
      console.log("Verification failed:", result.message);
      return { error: result.message };
    }
  } catch (error) {
    console.log("Error during verification:", error);
  }
}
