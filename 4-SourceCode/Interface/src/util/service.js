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
  const data = unwrapApiData(result.payload);
  return data || { error: "Unexpected server response." };
}

export async function fetchUserExams(userId, token) {
  const result = await requestJson(`/api/v1/quiz-ai/exams`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!result.ok) return { error: result.error || "Failed to fetch exams." };
  const data = unwrapApiData(result.payload);
  return data ?? result.payload;
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
    if (!result.payload?.success) {
      return result.payload || { error: "Wrong or invalid token." };
    }
    return result.payload;
  } catch {
    return { error: "Token verification failed." };
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

    const res = await fetch(`/api/v1/quiz-ai/Quiz/Generate`, {
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
    return data;
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

export async function renameQuiz(quizID, quizTitle, token) {
  const id = String(quizID ?? "").trim();
  const nextTitle = String(quizTitle ?? "").trim();

  if (!id) return { error: "Missing quiz id." };
  if (!nextTitle) return { error: "Title cannot be empty." };

  const result = await requestJson(`/api/v1/quiz-ai/${id}/rename`, {
    method: "PUT",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    json: { name: nextTitle },
  });

  if (!result.ok) {
    return { error: result.error || "Failed to rename quiz." };
  }

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
  };
}

export async function deleteQuizService(quizID, token) {
  const id = String(quizID ?? "").trim();
  if (!id) return { error: "Missing quiz id." };

  const result = await requestJson(
    `/api/v1/quiz-ai/quiz/delete?QuizID=${encodeURIComponent(id)}`,
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
  };
}

export async function fetchSharedExam(sharedId, token, userId) {
  const uuid = String(sharedId ?? "").trim();
  const uId = userId == null ? "" : String(userId).trim();

  if (!uuid) return { error: "Missing shared quiz id." };

  const result = await requestJson(
    `/api/v1/quiz-ai/ShareVerify?Token=${encodeURIComponent(uuid)}`,
    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      // Some backends may require userId; send it when available.
      json: uId ? { userId: uId, UUID: uuid } : undefined,
    }
  );

  console.log("fetchSharedExam result:", result);

  if (!result.ok) {
    return { error: result.error || "Failed to fetch shared quiz." };
  }

  const payload = result.payload;
  if (payload?.success === false) {
    return {
      error:
        payload?.message ||
        payload?.error ||
        result.error ||
        "Failed to fetch shared quiz (server).",
    };
  }

  const data = unwrapApiData(payload);

  // New backend behavior: success response with no quiz payload (e.g. data === true)
  // because the shared exam is persisted into the user's exams list.
  if (data === true || payload?.data === true) {
    return {
      success: true,
      saved: true,
      message: payload?.message || "Shared quiz saved successfully.",
    };
  }

  const quiz = data?.quiz ?? data?.exam ?? data;

  if (!quiz || typeof quiz !== "object") {
    return {
      error:
        payload?.message ||
        payload?.error ||
        result.error ||
        "Unexpected server response.",
    };
  }

  return quiz;
}

export async function regenerateQuiz(quizID, token, counts = {}) {
  const id = String(quizID ?? "").trim();
  if (!id) return { error: "Missing quiz id." };

  const tfCount = Number.isFinite(Number(counts?.tfCount))
    ? Number(counts.tfCount)
    : undefined;
  const mcqCount = Number.isFinite(Number(counts?.mcqCount))
    ? Number(counts.mcqCount)
    : undefined;

  const result = await requestJson(
    `/api/v1/quiz-ai/Quiz/Regenerate?QuizID=${id}`,
    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      json: {
        ...(tfCount != null ? { tfCount } : null),
        ...(mcqCount != null ? { mcqCount } : null),
      },
    }
  );

  if (!result.ok) {
    return { error: result.error || "Failed to regenerate quiz." };
  }

  const data = unwrapApiData(result.payload);
  if (data?.success === false) {
    return { error: data?.message || "Failed to regenerate quiz (server)." };
  }

  const quiz = data;

  if (!quiz || typeof quiz !== "object") {
    return { error: "Unexpected server response." };
  }

  return quiz;
}

export async function regenerateQuestion(quizID, questionId, type, token) {
  const qzId = String(quizID ?? "").trim();
  const qId = String(questionId ?? "").trim();

  if (!qzId) return { error: "Missing quiz id." };
  if (!qId) return { error: "Missing question id." };

  const result = await requestJson(
    `/api/v1/quiz-ai/regenerate-question?QuizID=${quizID}&QuestionID=${questionId}&QuestionType=${type}`,
    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
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

  return data;

  /* const maybeQuestion =
    data?.question ||
    data?.regeneratedQuestion ||
    data?.generatedQuestion ||
    data?.data?.question ||
    data;

  if (!maybeQuestion || typeof maybeQuestion !== "object") {
    return { error: "Unexpected server response." };
  }

  return maybeQuestion; */
}

export async function deleteQuestion(quizID, questionId, token) {
  const qzId = String(quizID ?? "").trim();
  const qId = String(questionId ?? "").trim();

  if (!qzId) return { error: "Missing quiz id." };
  if (!qId) return { error: "Missing question id." };

  // TODO: Replace this URL with the real backend endpoint when you have it.
  const url = `/api/v1/quiz-ai/Questions/delete?QuizID=${quizID}&QuestionID=${questionId}`;

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
  };
}

export async function submitExamAnswers(examSubmission, token) {
  const examId = String(examSubmission?.examId ?? "").trim();
  const answers = Array.isArray(examSubmission?.answers)
    ? examSubmission.answers
    : null;

  if (!examId) return { error: "Missing examId." };
  if (!answers || answers.length === 0) return { error: "Missing answers." };

  // Body format must be exactly:
  // {
  //   "examId": "...",
  //   "answers": [{ "questionId": "...", "selectedOptionId": "..." }]
  // }
  const payloadToSend = { examId, answers };
  console.log(
    `Submitting exam answers: ${JSON.stringify(payloadToSend, null, 2)}`
  );
  const result = await requestJson(`/api/v1/quiz-ai/submit`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    json: payloadToSend,
  });

  console.log("submitExamAnswers result:", result);
  if (!result.ok) {
    return { error: result.error || "Failed to submit exam answers." };
  }

  const data = unwrapApiData(result.payload);
  return data ?? result.payload ?? { success: true };
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

export async function getQuizInfo(token, quizID) {
  const result = await requestJson(`/api/v1/quiz-ai/Quiz/${quizID}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!result.ok)
    return { error: result.error || "Failed to fetch examm info." };
  const data = unwrapApiData(result.payload);
  return data ?? result.payload;
}

export async function getShareToken(quizID, token) {
  const result = await requestJson(`/api/v1/quiz-ai/Share?QuizID=${quizID}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!result.ok)
    return { error: result.error || "Failed to fetch share token." };
  const data = unwrapApiData(result.payload);
  return data ?? result.payload;
}
