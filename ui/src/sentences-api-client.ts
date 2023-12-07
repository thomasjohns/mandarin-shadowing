import { Index, Sentence, TranscriptionResponse } from "./types";

const SENTENCES_API_URL = "http://localhost:5000";

export const getSentences = async (): Promise<Sentence[]> => {
  const response = await fetch(`${SENTENCES_API_URL}/sentences`);
  return response.json();
};

export const getSentence = async (index: Index): Promise<Sentence | null> => {
  const response = await fetch(`${SENTENCES_API_URL}/sentences/${index}`);
  switch (response.status) {
    case 200:
      return response.json();
    case 404:
      return new Promise(() => Promise.resolve(null));
    default:
      throw new Error(`Unhandled status code: ${response.status}`);
  }
};

export const getSentenceAudio = async (index: Index): Promise<Blob | null> => {
  const response = await fetch(`${SENTENCES_API_URL}/sentences/${index}/audio`);
  switch (response.status) {
    case 200:
      return response.blob();
    case 404:
      return new Promise(() => Promise.resolve(null));
    default:
      throw new Error(`Unhandled status code: ${response.status}`);
  }
};

export const transcribe = async (
  pronunciationURL: string
): Promise<TranscriptionResponse> => {
  const pronunciationFile = await fetch(pronunciationURL)
    .then((data) => data.blob())
    .then(
      (blob) => new File([blob], "pronunciation.mp3", { type: "audio/mpeg" })
    );
  const formData = new FormData();
  formData.append("file", pronunciationFile);
  const response = await fetch(`${SENTENCES_API_URL}/transcribe`, {
    method: "POST",
    body: formData,
  });
  if (response.status === 200) {
    return response.json();
  } else {
    throw new Error("Failed to transcribe.");
  }
};
