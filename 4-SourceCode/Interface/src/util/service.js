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
    return Promise.reject(new Error("somthing went wrong", error));
  }
}

export async function generateQuizFromFile(file, token) {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_URL2}/quiz-ai/quiz/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    // Parse body robustly: some backends return JSON with wrong/missing content-type.
    let rawText = null;
    let body = null;
    try {
      rawText = await res.text();
      const trimmed = (rawText || "").trim();
      if (trimmed) {
        // Attempt JSON parse even if headers are wrong.
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
          body = JSON.parse(trimmed);
        }
      }
    } catch {
      // keep body/rawText as null
    }

    const headers = Object.fromEntries(res.headers.entries());

    const result = {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      url: res.url,
      headers,
      body,
      rawText,
    };

    if (!res.ok) {
      return {
        ...result,
        error:
          body?.error ||
          body?.message ||
          rawText ||
          `Request failed with status ${res.status}`,
      };
    }

    // Success: return full response object (caller reads result.body)
    return result;
  } catch (error) {
    return {
      ok: false,
      status: 0,
      statusText: "",
      url: "",
      headers: {},
      body: null,
      rawText: null,
      error: error?.message || "Network error while generating quiz.",
    };
  }
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
