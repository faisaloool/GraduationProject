const API_URL = "https://d58837bb-c348-4ce4-9768-3b480c517aba.mock.pstmn.io";
const API_URL2 = "https://382050f1-d285-4eac-93a7-adf0c0e0ef1f.mock.pstmn.io";
//old one with limtited urls const API_URL = "https://0befc81c-b05a-4c91-97dc-febeb4033999.mock.pstmn.io";

async function safeReadBody(res) {
  const contentType = res.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      return { json: await res.json(), text: null };
    }
  } catch {
    // fall back to text
  }

  let text = null;
  try {
    text = await res.text();
  } catch {
    text = null;
  }

  if (text) {
    const trimmed = text.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return { json: JSON.parse(trimmed), text };
      } catch {
        // ignore
      }
    }
  }

  return { json: null, text };
}

function unwrapApiData(payload) {
  // Supports both:
  // - { success, status, message, data: {...} }
  // - { user, token, ... }
  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data;
  }
  return payload;
}

function extractApiErrorMessage(payload, fallbackMessage) {
  if (!payload) return fallbackMessage;
  if (typeof payload === "string") return payload;

  const message =
    payload?.message ||
    payload?.error?.details ||
    payload?.error ||
    payload?.details;

  if (typeof message === "string" && message.trim()) return message;
  return fallbackMessage;
}

async function requestJson(url, { method = "GET", headers = {}, json } = {}) {
  try {
    const res = await fetch(url, {
      method,
      headers: {
        ...(json ? { "Content-Type": "application/json" } : null),
        ...headers,
      },
      body: json ? JSON.stringify(json) : undefined,
    });

    const { json: payload, text } = await safeReadBody(res);
    const defaultError = text?.trim()
      ? text.trim()
      : `Request failed with status ${res.status}`;

    return {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      url: res.url,
      payload,
      rawText: text,
      error: res.ok ? null : extractApiErrorMessage(payload, defaultError),
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      statusText: "",
      url,
      payload: null,
      rawText: null,
      error: err?.message || "Network error. Please try again.",
    };
  }
}

export async function loginUser(email, password) {
  const result = await requestJson(`/api/v1/quiz-ai/Login`, {
    method: "POST",
    json: { email, password },
  });

  if (!result.ok) return { error: result.error || "Login failed." };
  const data = unwrapApiData(result.payload);
  return data || { error: "Unexpected server response." };
}

export async function registerUser(name, email, password) {
  const result = await requestJson(`/api/v1/quiz-ai/Signup`, {
    method: "POST",
    json: { name, email, password },
  });

  if (!result.ok) return { error: result.error || "Sign up failed." };
  console.log(result);
  const data = unwrapApiData(result.payload);
  return data || { error: "Unexpected server response." };
}

export async function fetchUserExams(userId, token) {
  /* const result = await requestJson(`${API_URL}/quiz-ai/users/${userId}/exams`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!result.ok) return { error: result.error || "Failed to fetch exams." };
  const data = unwrapApiData(result.payload);
  return data ?? result.payload; */
  return {
    success: true,
    quizzes: [
      { examId: 1, title: "General Knowledge Test" },
      { examId: 2, title: "Programming Basics" },
      { examId: 3, title: "Software Engineering Principles" },
      { examId: 4, title: "Database Management System" },
      { examId: 5, title: "Networking Fundamentals" },
      { examId: 6, title: "Web Development Essentials" },
      { examId: 7, title: "Cybersecurity Basics" },
      { examId: 8, title: "Data Structures & Algorithms" },
      { examId: 9, title: "Operating Systems Concepts" },
      { examId: 10, title: "Cloud Computing Fundamentals" },
      { examId: 11, title: "Artificial Intelligence Introduction" },
      { examId: 12, title: "Mobile App Design Patterns" },
      { examId: 13, title: "Machine Learning Foundations" },
      { examId: 14, title: "UI/UX Design Principles" },
      { examId: 15, title: "Version Control with Git" },
      { examId: 16, title: "DevOps and CI/CD Pipelines" },
      { examId: 17, title: "Big Data Analytics" },
      { examId: 18, title: "Blockchain & Cryptography" },
      { examId: 19, title: "Internet of Things (IoT)" },
      { examId: 20, title: "Discrete Mathematics for CS" },
      { examId: 21, title: "API Design & Documentation" },
      { examId: 22, title: "Computer Architecture" },
      { examId: 23, title: "Python for Data Science" },
      { examId: 24, title: "Advanced Java Programming" },
      { examId: 25, title: "Linux Command Line Mastery" },
    ],
  };
}

export async function requestPasswordResetEmail(email) {
  const cleanEmail = String(email || "").trim();
  if (!cleanEmail) return { error: "Please enter your email first." };

  const result = await requestJson(`/api/v1/quiz-ai/Forgot-Password`, {
    method: "POST",
    json: { email: cleanEmail },
  });

  if (!result.ok) {
    return { error: result.error || "Failed to send password reset email." };
  }

  const data = unwrapApiData(result.payload);
  return (
    data ||
    result.payload || { success: true, message: "Password reset email sent." }
  );
}

export async function resetPassword(password, id) {
  const url = `/api/v1/quiz-ai/ResetPassword?id=${id}&password=${password}`;

  const result = await requestJson(url, {
    method: "POST",
  });

  if (!result.ok) {
    return { error: result.error || "Failed to reset password." };
  }

  // Return either unwrapped data or a generic success shape.
  const data = unwrapApiData(result.payload);
  return data || { success: true, message: "Password updated successfully." };
}

export async function verifyResetToken(token) {
  try {
    const result = await requestJson(
      `/api/v1/quiz-ai/VerifyForgetPasswordToken?token=${token}`,
      {
        method: "GET",
      }
    );
    console.log("erifyResetToken result", result.payload);
    if (!result.payload?.success) {
      return result.payload || { error: "Wrong or invalid token." };
    }
    return result.payload;
  } catch {
    return result.payload || { error: "Token verification failed." };
  }
}

export async function generateQuizFromFile(file, token, settings) {
  try {
    const formData = new FormData();
    formData.append("file", file);

    // Append settings as individual fields for easier backend parsing
    if (settings) {
      if (settings.mcqCount) formData.append("mcqCount", settings.mcqCount);
      if (settings.tfCount) formData.append("tfCount", settings.tfCount);
    }

    const res = await fetch(`/api/v1/quiz-ai/quiz/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    // Handle 401 Unauthorized or other non-OK status codes immediately
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Server error: ${res.status}`);
    }

    const data = await res.json();
    return {
      success: true,
      data: data,
    };
  } catch (error) {
    console.error("Quiz Generation Error:", error);
    return {
      success: false,
      error: error.message || "Network error while generating quiz.",
    };
  }
}

export async function verifyCode(code, id) {
  const result = await requestJson(
    `/api/v1/quiz-ai/VerifyNewUser?UserID=${id}&token=${code}`,
    {
      method: "POST",
    }
  );
  if (!result.ok) return { error: result.error || "Verification failed." };
  return result;
}

export async function renameQuiz(quizId, title, token) {
  const id = String(quizId ?? "").trim();
  const nextTitle = String(title ?? "").trim();

  if (!id) return { error: "Missing quiz id." };
  if (!nextTitle) return { error: "Title cannot be empty." };

  const result = await requestJson(
    `${API_URL}/quiz-ai/quiz/${encodeURIComponent(id)}/rename`,
    {
      // API doc uses PUT; some backends also accept POST.
      method: "PUT",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      // Send both keys for compatibility across backend implementations.
      json: { name: nextTitle, title: nextTitle },
    }
  );

  if (!result.ok) {
    return { error: result.error || "Failed to rename quiz." };
  }

  // Expected response:
  // {
  //   success: true,
  //   message: "Quiz renamed successfully.",
  //   quiz: { id: 1, title: "Updated Quiz Title" }
  // }
  // IMPORTANT: do NOT use the title from the response; use user-provided nextTitle.
  const payload = result.payload;
  const success = payload?.success;
  if (success === false) {
    return {
      error:
        payload?.message || result.error || "Failed to rename quiz (server).",
    };
  }

  const responseQuizId = payload?.quiz?.id ?? payload?.quiz?.quizId;
  const normalizedId = responseQuizId ?? id;

  return {
    success: true,
    message: payload?.message || "Quiz renamed successfully.",
    quiz: {
      id: normalizedId,
      title: nextTitle,
    },
  };
}

export async function deleteQuiz(quizId, token) {
  const id = String(quizId ?? "").trim();
  if (!id) return { error: "Missing quiz id." };

  const result = await requestJson(
    `${API_URL}/quiz-ai/quiz/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );

  if (!result.ok) {
    return { error: result.error || "Failed to delete quiz." };
  }

  const payload = result.payload;
  if (payload?.success === false) {
    return { error: payload?.message || "Failed to delete quiz (server)." };
  }

  return {
    success: true,
    message: payload?.message || "Quiz deleted successfully.",
    quizId: id,
  };
}

export async function fetchSharedExam(sharedId, userId, token) {
  const uuid = String(sharedId ?? "").trim();
  const uId = String(userId ?? "").trim();

  if (!uuid) return { error: "Missing shared quiz id." };
  if (!uId) return { error: "Missing userId." };

  const result = await requestJson(
    `${API_URL}/quiz-ai/shared/${encodeURIComponent(uuid)}`,
    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      json: { userId: uId, UUID: uuid },
    }
  );

  if (!result.ok) {
    return { error: result.error || "Failed to fetch shared quiz." };
  }

  const data = unwrapApiData(result.payload);
  const quiz = data?.quiz ?? data?.exam ?? data;

  if (!quiz || typeof quiz !== "object") {
    return { error: "Unexpected server response." };
  }

  return quiz;
}

export async function regenerateQuiz(quizId, token) {
  const id = String(quizId ?? "").trim();
  if (!id) return { error: "Missing quiz id." };

  const result = await requestJson(`${API_URL}/quiz-ai/quiz/regenrate`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    json: { quizId: id },
  });

  if (!result.ok) {
    return { error: result.error || "Failed to regenerate quiz." };
  }

  const data = unwrapApiData(result.payload);
  if (data?.success === false) {
    return { error: data?.message || "Failed to regenerate quiz (server)." };
  }

  const quiz = data?.quiz ?? data?.exam ?? data;
  if (!quiz || typeof quiz !== "object") {
    return { error: "Unexpected server response." };
  }

  return quiz;
}

export async function regenerateQuestion(
  quizId,
  questionId,
  questionPayload,
  token
) {
  const qzId = String(quizId ?? "").trim();
  const qId = String(questionId ?? "").trim();

  if (!qzId) return { error: "Missing quiz id." };
  if (!qId) return { error: "Missing question id." };

  const result = await requestJson(
    `${API_URL}//quiz-ai/${encodeURIComponent(
      qzId
    )}/question/${encodeURIComponent(qId)}/regenerate`,
    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      // Send a few compatible keys; backend expectations may vary.
      json: {
        quizId: qzId,
        questionId: qId,
        question: questionPayload,
      },
    }
  );

  if (!result.ok) {
    return { error: result.error || "Failed to regenerate question." };
  }

  const data = unwrapApiData(result.payload);

  if (data?.success === false) {
    return {
      error:
        data?.message ||
        result.error ||
        "Failed to regenerate question (server).",
    };
  }

  const maybeQuestion =
    data?.question ||
    data?.regeneratedQuestion ||
    data?.generatedQuestion ||
    data?.data?.question ||
    data;

  if (!maybeQuestion || typeof maybeQuestion !== "object") {
    return { error: "Unexpected server response." };
  }

  return maybeQuestion;
}

export async function deleteQuestion(quizId, questionId, token) {
  const qzId = String(quizId ?? "").trim();
  const qId = String(questionId ?? "").trim();

  if (!qzId) return { error: "Missing quiz id." };
  if (!qId) return { error: "Missing question id." };

  // TODO: Replace this URL with the real backend endpoint when you have it.
  const url = `${API_URL}/quiz-ai/${encodeURIComponent(
    qzId
  )}/question/${encodeURIComponent(qId)}`;

  const result = await requestJson(url, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!result.ok) {
    return { error: result.error || "Failed to delete question." };
  }

  const data = unwrapApiData(result.payload);
  if (data?.success === false) {
    return { error: data?.message || "Failed to delete question (server)." };
  }

  return {
    success: true,
    message: data?.message || "Question deleted successfully.",
    quizId: qzId,
    questionId: qId,
  };
}

export async function getHealth() {
  const result = await requestJson(`/api/v1/quiz-ai/health`, {
    method: "GET",
  });

  if (!result.ok) {
    return {
      error: result.error || "Health check failed. Server may be down.",
    };
  }

  return result;
}

const allQuizzes = [
  {
    quizId: "QZ-982134",
    quizName: "Lecture 1 Auto Quiz",
    quizType: "Mixed",
    createdAt: "2025-11-06T10:15:00Z",
    examId: 1,
    title: "General Knowledge Test",
    totalMarks: 10,
    questions: [
      {
        id: 1,
        type: "MCQ",
        question: "What is the capital of Jordan?",
        options: ["Amman", "Madin", "Egypt", "Mu'tah"],
        correctAnswer: "a",
        marks: 2,
      },
      {
        id: 2,
        type: "MCQ",
        question: "Which language is used for web styling?",
        options: ["HTML", "CSS", "Python", "C++"],
        correctAnswer: "b",
        marks: 2,
      },
    ],
  },
  {
    quizId: "QZ-982135",
    quizName: "Lecture 2 Auto Quiz",
    quizType: "Mixed",
    createdAt: "2025-11-06T10:15:00Z",
    examId: 2,
    title: "Programming Basics",
    totalMarks: 12,
    questions: [
      {
        id: 1,
        type: "MCQ",
        question: "Who developed JavaScript?",
        options: [
          "Brendan Eich",
          "Tim Berners-Lee",
          "Guido van Rossum",
          "James Gosling",
        ],
        correctAnswer: "a",
        marks: 2,
      },
      {
        id: 2,
        type: "MCQ",
        question: "What does HTTP stand for?",
        options: [
          "HyperText Transfer Protocol",
          "HighText Transmission Process",
          "Hyper Transfer Text Protocol",
          "None",
        ],
        correctAnswer: "a",
        marks: 2,
      },
      {
        id: 3,
        type: "MCQ",
        question: "What is 5 + 7?",
        options: ["10", "11", "12", "13"],
        correctAnswer: "c",
        marks: 2,
      },
    ],
  },
  {
    quizId: "QZ-982136",
    quizName: "Lecture 3 Auto Quiz",
    quizType: "Mixed",
    createdAt: "2025-11-06T10:15:00Z",
    examId: 3,
    title: "Software Engineering Principles",
    totalMarks: 12,
    questions: [
      {
        id: 1,
        type: "MCQ",
        question: "What does SDLC stand for?",
        options: [
          "Software Development Life Cycle",
          "System Data Logic Cycle",
          "Software Design Level Code",
          "System Development Life Control",
        ],
        correctAnswer: "a",
        marks: 2,
      },
      {
        id: 2,
        type: "MCQ",
        question: "Which model emphasizes working software over documentation?",
        options: ["Agile", "Waterfall", "V-Model", "Spiral"],
        correctAnswer: "a",
        marks: 2,
      },
      {
        id: 3,
        type: "MCQ",
        question: "In which phase are requirements gathered?",
        options: [
          "Planning",
          "Requirements Analysis",
          "Testing",
          "Implementation",
        ],
        correctAnswer: "b",
        marks: 2,
      },
    ],
  },
  {
    quizId: "QZ-982137",
    quizName: "Lecture 4 Auto Quiz",
    quizType: "Mixed",
    createdAt: "2025-11-06T10:15:00Z",
    examId: 4,
    title: "Database Management System",
    totalMarks: 16,
    questions: [
      {
        id: 1,
        type: "MCQ",
        question: "What does SQL stand for?",
        options: [
          "Structured Query Language",
          "System Query Logic",
          "Simple Query List",
          "Standard Question Language",
        ],
        correctAnswer: "a",
        marks: 2,
      },
      {
        id: 2,
        type: "MCQ",
        question: "Which command is used to remove a table from a database?",
        options: ["DELETE", "REMOVE", "DROP", "TRUNCATE"],
        correctAnswer: "c",
        marks: 2,
      },
      {
        id: 3,
        type: "MCQ",
        question: "Which of these is a NoSQL database?",
        options: ["MongoDB", "MySQL", "PostgreSQL", "Oracle"],
        correctAnswer: "a",
        marks: 2,
      },
      {
        id: 4,
        type: "MCQ",
        question: "What is a foreign key used for?",
        options: [
          "To link tables",
          "To speed up queries",
          "To store data types",
          "To encrypt data",
        ],
        correctAnswer: "a",
        marks: 2,
      },
    ],
  },
  {
    quizId: "QZ-982138",
    quizName: "Lecture 5 Auto Quiz",
    quizType: "Mixed",
    createdAt: "2025-11-06T10:15:00Z",
    examId: 5,
    title: "Networking Fundamentals",
    totalMarks: 16,
    questions: [
      {
        id: 1,
        type: "MCQ",
        question: "What does IP stand for?",
        options: [
          "Internet Protocol",
          "Internal Process",
          "Internet Package",
          "Interconnected Program",
        ],
        correctAnswer: "a",
        marks: 2,
      },
      {
        id: 2,
        type: "MCQ",
        question: "Which layer of the OSI model handles routing?",
        options: [
          "Network Layer",
          "Transport Layer",
          "Session Layer",
          "Data Link Layer",
        ],
        correctAnswer: "a",
        marks: 2,
      },
      {
        id: 3,
        type: "MCQ",
        question: "What device connects multiple networks together?",
        options: ["Switch", "Hub", "Router", "Bridge"],
        correctAnswer: "c",
        marks: 2,
      },
      {
        id: 4,
        type: "MCQ",
        question: "What is the default port for HTTP?",
        options: ["80", "443", "21", "25"],
        correctAnswer: "a",
        marks: 2,
      },
    ],
  },

  // --- 20 NEW QUIZZES ---
  {
    quizId: "QZ-982139",
    quizName: "Lecture 6 Auto Quiz",
    quizType: "Mixed",
    createdAt: "2025-11-07T09:00:00Z",
    examId: 6,
    title: "Web Development Essentials",
    totalMarks: 4,
    questions: [
      {
        id: 1,
        type: "MCQ",
        question: "Which tag is used for the largest heading?",
        options: ["<h6>", "<h1>", "<head>", "<header>"],
        correctAnswer: "b",
        marks: 2,
      },
      {
        id: 2,
        type: "MCQ",
        question: "Which property changes text color in CSS?",
        options: ["font-color", "text-style", "color", "background-color"],
        correctAnswer: "c",
        marks: 2,
      },
    ],
  },
  {
    quizId: "QZ-982140",
    quizName: "Lecture 7 Auto Quiz",
    quizType: "Mixed",
    createdAt: "2025-11-07T10:00:00Z",
    examId: 7,
    title: "Cybersecurity Basics",
    totalMarks: 4,
    questions: [
      {
        id: 1,
        type: "MCQ",
        question: "What does '2FA' stand for?",
        options: [
          "Two-Factor Authorization",
          "Two-Factor Authentication",
          "Two-Files Access",
          "True-Form Auth",
        ],
        correctAnswer: "b",
        marks: 2,
      },
      {
        id: 2,
        type: "MCQ",
        question: "Which of these is a social engineering attack?",
        options: ["Phishing", "DDoS", "SQL Injection", "Brute Force"],
        correctAnswer: "a",
        marks: 2,
      },
    ],
  },
  {
    quizId: "QZ-982141",
    quizName: "Lecture 8 Auto Quiz",
    quizType: "Mixed",
    createdAt: "2025-11-08T08:30:00Z",
    examId: 8,
    title: "Data Structures & Algorithms",
    totalMarks: 4,
    questions: [
      {
        id: 1,
        type: "MCQ",
        question: "Which data structure uses LIFO?",
        options: ["Queue", "Stack", "Array", "Linked List"],
        correctAnswer: "b",
        marks: 2,
      },
      {
        id: 2,
        type: "MCQ",
        question: "What is the time complexity of Binary Search?",
        options: ["O(n)", "O(n^2)", "O(log n)", "O(1)"],
        correctAnswer: "c",
        marks: 2,
      },
    ],
  },
  {
    quizId: "QZ-982142",
    quizName: "Lecture 9 Auto Quiz",
    quizType: "Mixed",
    createdAt: "2025-11-09T11:00:00Z",
    examId: 9,
    title: "Operating Systems Concepts",
    totalMarks: 4,
    questions: [
      {
        id: 1,
        type: "MCQ",
        question: "Which of these is a core part of an OS?",
        options: ["Shell", "Kernel", "Compiler", "Browser"],
        correctAnswer: "b",
        marks: 2,
      },
      {
        id: 2,
        type: "MCQ",
        question: "What is a deadlock?",
        options: [
          "Process waiting on itself",
          "Infinite loop",
          "Processes waiting on each other",
          "System shutdown",
        ],
        correctAnswer: "c",
        marks: 2,
      },
    ],
  },
  {
    quizId: "QZ-982143",
    quizName: "Lecture 10 Auto Quiz",
    quizType: "Mixed",
    createdAt: "2025-11-10T14:20:00Z",
    examId: 10,
    title: "Cloud Computing Fundamentals",
    totalMarks: 4,
    questions: [
      {
        id: 1,
        type: "MCQ",
        question: "What does SaaS stand for?",
        options: [
          "Software as a Service",
          "System as a Service",
          "Storage as a System",
          "Service as a Software",
        ],
        correctAnswer: "a",
        marks: 2,
      },
      {
        id: 2,
        type: "MCQ",
        question: "Which is a major cloud provider?",
        options: ["AWS", "Windows 95", "Localhost", "NPM"],
        correctAnswer: "a",
        marks: 2,
      },
    ],
  },
  {
    quizId: "QZ-982144",
    quizName: "Lecture 11 Auto Quiz",
    quizType: "Mixed",
    createdAt: "2025-11-11T09:15:00Z",
    examId: 11,
    title: "Artificial Intelligence Introduction",
    totalMarks: 4,
    questions: [
      {
        id: 1,
        type: "MCQ",
        question: "What does NLP stand for?",
        options: [
          "Natural Language Processing",
          "Node Logic Process",
          "Neural Level Program",
          "Network Link Protocol",
        ],
        correctAnswer: "a",
        marks: 2,
      },
      {
        id: 2,
        type: "MCQ",
        question: "Who is considered the father of AI?",
        options: ["Alan Turing", "Steve Jobs", "Bill Gates", "John McCarthy"],
        correctAnswer: "d",
        marks: 2,
      },
    ],
  },
  {
    quizId: "QZ-982145",
    quizName: "Lecture 12 Auto Quiz",
    quizType: "Mixed",
    createdAt: "2025-11-12T13:45:00Z",
    examId: 12,
    title: "Mobile App Design Patterns",
    totalMarks: 4,
    questions: [
      {
        id: 1,
        type: "MCQ",
        question: "Which language is used for native iOS apps?",
        options: ["Kotlin", "Swift", "Java", "C#"],
        correctAnswer: "b",
        marks: 2,
      },
      {
        id: 2,
        type: "MCQ",
        question: "What does APK stand for?",
        options: [
          "Android Package Kit",
          "App Port Key",
          "Android Process Kernel",
          "App Program Kit",
        ],
        correctAnswer: "a",
        marks: 2,
      },
    ],
  },
  {
    quizId: "QZ-982146",
    quizName: "Lecture 13 Auto Quiz",
    quizType: "Mixed",
    createdAt: "2025-11-13T10:10:00Z",
    examId: 13,
    title: "Machine Learning Foundations",
    totalMarks: 4,
    questions: [
      {
        id: 1,
        type: "MCQ",
        question: "Which is a type of ML?",
        options: ["Supervised", "Overjoyed", "Programmed", "Fixed"],
        correctAnswer: "a",
        marks: 2,
      },
      {
        id: 2,
        type: "MCQ",
        question: "What is 'Overfitting'?",
        options: [
          "Too much data",
          "Model matches noise too well",
          "System crash",
          "Hardware failure",
        ],
        correctAnswer: "b",
        marks: 2,
      },
    ],
  },
  {
    quizId: "QZ-982147",
    quizName: "Lecture 14 Auto Quiz",
    quizType: "Mixed",
    createdAt: "2025-11-14T15:30:00Z",
    examId: 14,
    title: "UI/UX Design Principles",
    totalMarks: 4,
    questions: [
      {
        id: 1,
        type: "MCQ",
        question: "What does UX stand for?",
        options: [
          "User Exchange",
          "User Experience",
          "Unit eXample",
          "User Expert",
        ],
        correctAnswer: "b",
        marks: 2,
      },
      {
        id: 2,
        type: "MCQ",
        question: "Which is a UX wireframing tool?",
        options: ["Figma", "Excel", "Postman", "Git"],
        correctAnswer: "a",
        marks: 2,
      },
    ],
  },
  {
    quizId: "QZ-982148",
    quizName: "Lecture 15 Auto Quiz",
    quizType: "Mixed",
    createdAt: "2025-11-15T11:00:00Z",
    examId: 15,
    title: "Version Control with Git",
    totalMarks: 4,
    questions: [
      {
        id: 1,
        type: "MCQ",
        question: "Command to save changes locally?",
        options: ["git push", "git pull", "git commit", "git save"],
        correctAnswer: "c",
        marks: 2,
      },
      {
        id: 2,
        type: "MCQ",
        question: "How do you stage all files?",
        options: ["git add .", "git stage all", "git push", "git status"],
        correctAnswer: "a",
        marks: 2,
      },
    ],
  },
  {
    quizId: "QZ-982149",
    quizName: "Lecture 16 Auto Quiz",
    quizType: "Mixed",
    createdAt: "2025-11-16T09:20:00Z",
    examId: 16,
    title: "DevOps and CI/CD Pipelines",
    totalMarks: 4,
    questions: [
      {
        id: 1,
        type: "MCQ",
        question: "What does CI stand for?",
        options: [
          "Continuous Integration",
          "Code Improvement",
          "Core Infrastructure",
          "Commit Install",
        ],
        correctAnswer: "a",
        marks: 2,
      },
      {
        id: 2,
        type: "MCQ",
        question: "Which is a CI/CD tool?",
        options: ["Jenkins", "Chrome", "Spotify", "VLC"],
        correctAnswer: "a",
        marks: 2,
      },
    ],
  },
  {
    quizId: "QZ-982150",
    quizName: "Lecture 17 Auto Quiz",
    quizType: "Mixed",
    createdAt: "2025-11-17T12:00:00Z",
    examId: 17,
    title: "Big Data Analytics",
    totalMarks: 4,
    questions: [
      {
        id: 1,
        type: "MCQ",
        question: "Which is one of the 'V's of Big Data?",
        options: ["Velocity", "Validation", "Vertical", "Version"],
        correctAnswer: "a",
        marks: 2,
      },
      {
        id: 2,
        type: "MCQ",
        question: "Which framework is used for big data?",
        options: ["Hadoop", "NodeJS", "JQuery", "Sass"],
        correctAnswer: "a",
        marks: 2,
      },
    ],
  },
  {
    quizId: "QZ-982151",
    quizName: "Lecture 18 Auto Quiz",
    quizType: "Mixed",
    createdAt: "2025-11-18T16:45:00Z",
    examId: 18,
    title: "Blockchain & Cryptography",
    totalMarks: 4,
    questions: [
      {
        id: 1,
        type: "MCQ",
        question: "Who created Bitcoin?",
        options: [
          "Satoshi Nakamoto",
          "Vitalik Buterin",
          "Elon Musk",
          "Mark Zuckerberg",
        ],
        correctAnswer: "a",
        marks: 2,
      },
      {
        id: 2,
        type: "MCQ",
        question: "What type of ledger is Blockchain?",
        options: ["Centralized", "Distributed", "Temporary", "Encrypted"],
        correctAnswer: "b",
        marks: 2,
      },
    ],
  },
  {
    quizId: "QZ-982152",
    quizName: "Lecture 19 Auto Quiz",
    quizType: "Mixed",
    createdAt: "2025-11-19T10:30:00Z",
    examId: 19,
    title: "Internet of Things (IoT)",
    totalMarks: 4,
    questions: [
      {
        id: 1,
        type: "MCQ",
        question: "What does IoT stand for?",
        options: [
          "Internet of Things",
          "Input of Time",
          "Internal online Terminal",
          "Interconnected of Tools",
        ],
        correctAnswer: "a",
        marks: 2,
      },
      {
        id: 2,
        type: "MCQ",
        question: "Common protocol for IoT?",
        options: ["MQTT", "FTP", "POP3", "SMTP"],
        correctAnswer: "a",
        marks: 2,
      },
    ],
  },
  {
    quizId: "QZ-982153",
    quizName: "Lecture 20 Auto Quiz",
    quizType: "Mixed",
    createdAt: "2025-11-20T14:00:00Z",
    examId: 20,
    title: "Discrete Mathematics for CS",
    totalMarks: 4,
    questions: [
      {
        id: 1,
        type: "MCQ",
        question: "What is a Set?",
        options: [
          "Collection of distinct objects",
          "A type of loop",
          "Array of numbers",
          "String of text",
        ],
        correctAnswer: "a",
        marks: 2,
      },
      {
        id: 2,
        type: "MCQ",
        question: "Result of TRUE AND FALSE?",
        options: ["TRUE", "FALSE", "UNDEFINED", "NULL"],
        correctAnswer: "b",
        marks: 2,
      },
    ],
  },
  {
    quizId: "QZ-982154",
    quizName: "Lecture 21 Auto Quiz",
    quizType: "Mixed",
    createdAt: "2025-11-21T09:00:00Z",
    examId: 21,
    title: "API Design & Documentation",
    totalMarks: 4,
    questions: [
      {
        id: 1,
        type: "MCQ",
        question: "What does REST stand for?",
        options: [
          "Representational State Transfer",
          "Remote System Test",
          "Regular Service Terminal",
          "Relational State Table",
        ],
        correctAnswer: "a",
        marks: 2,
      },
      {
        id: 2,
        type: "MCQ",
        question: "Common tool for API documentation?",
        options: ["Swagger", "Photoshop", "Unity", "Slack"],
        correctAnswer: "a",
        marks: 2,
      },
    ],
  },
  {
    quizId: "QZ-982155",
    quizName: "Lecture 22 Auto Quiz",
    quizType: "Mixed",
    createdAt: "2025-11-22T11:45:00Z",
    examId: 22,
    title: "Computer Architecture",
    totalMarks: 4,
    questions: [
      {
        id: 1,
        type: "MCQ",
        question: "What is the 'Brain' of the computer?",
        options: ["RAM", "CPU", "SSD", "GPU"],
        correctAnswer: "b",
        marks: 2,
      },
      {
        id: 2,
        type: "MCQ",
        question: "What does RAM stand for?",
        options: [
          "Random Access Memory",
          "Read Always Mode",
          "Run Active Module",
          "Remote Access Memory",
        ],
        correctAnswer: "a",
        marks: 2,
      },
    ],
  },
  {
    quizId: "QZ-982156",
    quizName: "Lecture 23 Auto Quiz",
    quizType: "Mixed",
    createdAt: "2025-11-23T15:00:00Z",
    examId: 23,
    title: "Python for Data Science",
    totalMarks: 4,
    questions: [
      {
        id: 1,
        type: "MCQ",
        question: "Library used for Dataframes?",
        options: ["Pandas", "React", "Flask", "Django"],
        correctAnswer: "a",
        marks: 2,
      },
      {
        id: 2,
        type: "MCQ",
        question: "Command to install a library?",
        options: ["pip install", "get install", "npm install", "run library"],
        correctAnswer: "a",
        marks: 2,
      },
    ],
  },
  {
    quizId: "QZ-982157",
    quizName: "Lecture 24 Auto Quiz",
    quizType: "Mixed",
    createdAt: "2025-11-24T10:15:00Z",
    examId: 24,
    title: "Advanced Java Programming",
    totalMarks: 4,
    questions: [
      {
        id: 1,
        type: "MCQ",
        question: "What is a JVM?",
        options: [
          "Java Virtual Machine",
          "Java Version Manager",
          "Joint Variable Module",
          "Java Visual Monitor",
        ],
        correctAnswer: "a",
        marks: 2,
      },
      {
        id: 2,
        type: "MCQ",
        question: "Keyword to inherit a class?",
        options: ["extends", "includes", "implements", "takes"],
        correctAnswer: "a",
        marks: 2,
      },
    ],
  },
  {
    quizId: "QZ-982158",
    quizName: "Lecture 25 Auto Quiz",
    quizType: "Mixed",
    createdAt: "2025-11-25T13:30:00Z",
    examId: 25,
    title: "Linux Command Line Mastery",
    totalMarks: 4,
    questions: [
      {
        id: 1,
        type: "MCQ",
        question: "Command to list files?",
        options: ["ls", "cd", "mkdir", "rm"],
        correctAnswer: "a",
        marks: 2,
      },
      {
        id: 2,
        type: "MCQ",
        question: "Command to see current directory?",
        options: ["pwd", "whereami", "dir", "loc"],
        correctAnswer: "a",
        marks: 2,
      },
    ],
  },
];

export async function getQuizInfo(token, quizId) {
  const id = String(quizId ?? "").trim();
  if (!id) return { error: "Missing quiz id." };
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  const exam = allQuizzes.find(
    (quiz) => String(quiz.examId) === id || quiz.quizId === id
  );
  if (!exam) return { error: "Quiz not found." };

  return exam;
}
