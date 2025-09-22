import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { upgradeWebSocket } from "npm:hono/deno";
import {
  cert,
  getApps,
  initializeApp,
  ServiceAccount,
} from "npm:firebase-admin/app";
import { getAuth } from "npm:firebase-admin/auth";
import { getFirestore } from "npm:firebase-admin/firestore";
import {
  AuthResult,
  ClassroomModel,
  QuizModel,
  TaskModel,
  UserProfile,
} from "./models.ts";

const firebaseConfig: ServiceAccount = {
  projectId: "nekodb-fire",
  privateKey:
    "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCYlo248lh4AbPT\nUrcNxkyT5NFoqUVRgxDcb2nENy6BFTNosKjaeQV0vUwlp0bp98Tivt4dTYh6MRBv\nwLnvHhIr3/+cQXqOXWw3hVE4Vn1FzVsoD4XyxsYh9RuilD325lcRllCOdp8cpA25\nChUdun/RqBzaw5g1/tsVRO2RZKWUTTubXSUaky8DjKTuw3+VevYt868E77Cifehf\nyMwyScrXZD3+cnelHo065H3iIqoj47aCbSTpb/Ev57ckgdH5RLHZmbS0BS53+v4L\n2p72SagAf5T/vgO0J0hGKglmJABjgrS56OTfAToxV/Ih/2mFoSESiFNBfeUeRrSJ\nLYxEV0+1AgMBAAECggEABo+itGsnRrG8C8Aowtzd+hYCsx9kLacXGINp5tgAlehV\nd5DxEcPWajihh5TzxaezvZQ7dMMatTZa4JNG63M9kMlm8k8Wd/yoZJLE9UkyxceY\nvdY9Cj1l05v4fjsllvI8mDMAb7/GA7NCK8y1L7wPNvKlmvqCFwBIZ1e5Z2EOhZvj\njaR85OFnQS2k999Az4ZpoMKO1mwTLqtL1UgxeXF0Jg3oX6bjp6q+PG3IrW9LM9q8\n5Cxy7Of0O7cARMpgDonJbFs0JKgGH8fPgh+yOSTVwdMZAOpFbTxoJIPID1TyYark\niuq0eC4dJGd+WgY35WoucJAAry4bPxjLr0Wn8n2vQQKBgQDKsknNbByjGt5aSZLF\nV0pbki/GpQruJ+7xbTBeZq7AVr3M+slkzehAuvp/WZGmoLOYrydCXM3ykZa6Xij5\nP8vdD8NNnIDMHz1cVZHw043+i3wEKkc1aP8ThSxG+sQQ3K/Iw0A/lzFw6gWGinWW\nz544lCxnrFL0BgElC9sTWwi6GQKBgQDAtuz1FOiikTTo8MC+tubqQ3KMK01y1NCC\nQCyeVuB7vVRHco7KqNhf1XzhWj0D9AW3Fo7S+5ChcSUzqfHu/UGZ6Hxr1Bhj0WNl\nlDLYkxo9eUv8B36WYMsOVXAr4TMVoCUGsGnWQZTMgH8METfjda+1MI5RChqNDnTp\nDl63Zikt/QKBgF/EZMI9tjoJ08xsvn+mgmdJZnFAQS3MiERhBl1TvnT5hqt2Qfjy\noC0VKo1I0FwdyTz2ZGIiXtuglcpv+oPo9HT5oZjlvKS0jdU2SMGz8n61gF6nawV9\nGicq4ISYrlIZMqR0O8LPuHhU2U9705rxdRveRiylanwI6jmKpHM8q57hAoGAfoFW\nSYfhMp5ZejRYgpk0OkHuVt8yJxhWi7ouz/49vFzLj18/Jv/xke9l29TNyuOMQOTY\n+tzS03efsSt1OqobPzojOvFu1U+ljQ/c1Niz1/jhDV+qFHMTuKQTT2q0ixSmWZ7C\nyzgfwqLzQ2umIXWm0y09rysPxNrhmf+p44B3tc0CgYAC2fmsdIl5g2nBpEVvVUiW\ngbjjXdMwqh1Jv+KP1aYeZRMb6QZxrXPnJj8DL7GuCqzaIn+I/7IX/b/Lo6fNU4rQ\nUo5VUyIjbRCBCCT1fo0Fsyba9DBOkrEQwgHKftpEkxcXAnXPyTl1km0LtY9YUJgo\n+MPxUww5dsArw72RuI/Qfw==\n-----END PRIVATE KEY-----\n",
  clientEmail: "firebase-adminsdk-ahb28@nekodb-fire.iam.gserviceaccount.com",
};

if (getApps().length === 0) {
  initializeApp({
    credential: cert(firebaseConfig),
  });
}

const auth = getAuth();
const db = getFirestore();

const app = new Hono();

app.use("*", cors());

app.get(
  "/ws",
  upgradeWebSocket(() => {
    return {
      onMessage(event, ws) {
        console.log(`Message from client: ${event.data}`);
        ws.send("Hello from server!");
      },
      onClose: () => {
        console.log("Connection closed");
      },
    };
  }),
);

app.get("/", (c) => c.text("Deno Hono Server is running!"));

app.post("/auth/login", async (c) => {
  const { email, password } = await c.req.json();
  try {
    const userRecord = await auth.getUserByEmail(email);
    const customToken = await auth.createCustomToken(userRecord.uid);
    const profileDoc = await db.collection("users").doc(userRecord.uid).get();
    const profile: UserProfile = profileDoc.exists
      ? profileDoc.data() as UserProfile
      : {
        id: userRecord.uid,
        name: userRecord.displayName ?? email.split("@")[0],
        email: userRecord.email!,
        role: "student",
        avatarUrl: userRecord.photoURL ?? "",
      };
    const result: AuthResult = {
      token: customToken,
      profile,
    };
    return c.json(result);
  } catch (_e) {
    return c.json({ error: "Invalid credentials" }, 401);
  }
});

app.post("/auth/register", async (c) => {
  const { email, password, name } = await c.req.json();
  try {
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });
    const profile: UserProfile = {
      id: userRecord.uid,
      name,
      email,
      role: "student",
      avatarUrl: "",
    };
    await db.collection("users").doc(userRecord.uid).set(profile);
    const customToken = await auth.createCustomToken(userRecord.uid);
    const result: AuthResult = {
      token: customToken,
      profile,
    };
    return c.json(result);
  } catch (_e) {
    return c.json({ error: "Registration failed", details: `${_e}` }, 400);
  }
});

import type { Context, Next } from "npm:hono";

type ContextWithUid = Context & { uid?: string };

async function verifyAuth(c: ContextWithUid, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) return c.json({ error: "Missing token" }, 401);
  const token = authHeader.replace(/^Bearer\s+/, "");
  try {
    const decoded = await auth.verifyIdToken(token);
    c.uid = decoded.uid;
    await next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
}

app.get("/classrooms", verifyAuth, async (c) => {
  const snapshot = await db.collection("classrooms").get();
  const classrooms: ClassroomModel[] = [];
  snapshot.forEach((doc) => classrooms.push(doc.data() as ClassroomModel));
  return c.json(classrooms);
});

app.post("/classrooms", verifyAuth, async (c) => {
  const { name, description } = await c.req.json();
  const uid = (c as ContextWithUid).uid!;
  const userDoc = await db.collection("users").doc(uid).get();
  const teacherName = userDoc.exists
    ? (userDoc.data() as UserProfile).name
    : "Unknown";
  const id = db.collection("classrooms").doc().id;
  const classroom: ClassroomModel = {
    id,
    name,
    description,
    teacherName,
    studentsCount: 0,
  };
  await db.collection("classrooms").doc(id).set(classroom);
  return c.json(classroom);
});

app.get("/classrooms/:id", verifyAuth, async (c) => {
  const id = c.req.param("id");
  const doc = await db.collection("classrooms").doc(id).get();
  if (!doc.exists) return c.json({ error: "Classroom not found" }, 404);
  return c.json(doc.data() as ClassroomModel);
});

app.get("/classrooms/:id/tasks", verifyAuth, async (c) => {
  const classroomId = c.req.param("id");
  const snapshot = await db.collection("tasks").where(
    "classroomId",
    "==",
    classroomId,
  ).get();
  const tasks: TaskModel[] = [];
  snapshot.forEach((doc) => tasks.push(doc.data() as TaskModel));
  return c.json(tasks);
});

app.post("/classrooms/:id/tasks", verifyAuth, async (c) => {
  const classroomId = c.req.param("id");
  const { title, description, type, quizId, dueDate } = await c.req.json();
  const id = db.collection("tasks").doc().id;
  const task: TaskModel = {
    id,
    classroomId,
    title,
    description,
    type,
    quizId: quizId ?? null,
    dueDate: dueDate ?? null,
    isCompleted: false,
  };
  await db.collection("tasks").doc(id).set(task);
  return c.json(task);
});

app.post("/tasks/:taskId/complete", verifyAuth, async (c) => {
  const taskId = c.req.param("taskId");
  const docRef = db.collection("tasks").doc(taskId);
  const doc = await docRef.get();
  if (!doc.exists) return c.json({ error: "Task not found" }, 404);
  await docRef.update({ isCompleted: true });
  const updated: TaskModel = {
    ...(doc.data() as TaskModel),
    isCompleted: true,
  };
  return c.json(updated);
});

app.get("/quiz/:id", verifyAuth, async (c) => {
  const id = c.req.param("id");
  const doc = await db.collection("quizzes").doc(id).get();
  if (!doc.exists) return c.json({ error: "Quiz not found" }, 404);
  return c.json(doc.data() as QuizModel);
});

Deno.serve(app.fetch, { port: 8787 });
console.log("🚀 Server running on http://localhost:8787");
