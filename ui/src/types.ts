/* Example Sentence:
  {
    "index": 60,
    "kind": "sent",
    "content": "\u4f60\u5728\u60f3\u4ec0\u4e48\uff1f",
    "pinyin": "N\u01d0 z\u00e0i xi\u01ceng sh\u00e9nme?",
    "audio": "refold-51.mp3",
    "meaning": "What are you thinking about?",
    "words": [
      [
        "\u4f60",
        [
          "you (informal, as opposed to courteous \u60a8[nin2]); \n",
          "n\u00edn"
        ]
      ],
      [
        "\u5728",
        [
          "(located) at; (to be) in; to exist; in the middle of doing sth; (indicating an action in progress); \n",
          "z\u00e0i"
        ]
      ],
      [
        "\u60f3",
        [
          "to think; to believe; to suppose; to wish; to want; to miss (feel wistful about the absence of sb or sth); \n",
          "xi\u01ceng"
        ]
      ],
      [
        "\u4ec0\u4e48",
        [
          "what? (replaces the noun to turn a statement into a question)",
          "sh\u00e9nme"
        ]
      ]
    ]
  }
*/

export type Index = number;
export type Kind = "sent";
export type Audio = string;
export type Content = string;
export type Char = string;
export type Meaning = string;
export type Pinyin = string;
export type Word = [Char, [Meaning, Pinyin]];
export type Sentence = {
  index: Index;
  kind: Kind;
  content: Content;
  pinyin: Pinyin;
  audio: Audio;
  meaning: Meaning;
  words: Word[];
};

export type LocationState = {
  index: Index;
};

export type TranscriptionResponse = {
  content: {
    transcription: Content;
    native: Content;
    transcriptionMatchedIndices: number[][]; // array of arrays to represent to have match group in each array
    nativeMatchedIndices: number[][]; // array of arrays to represent to have match group in each array
    transcriptionMissedIndices: number[][];
    nativeMissedIndices: number[][];
  };
  pinyin: {
    transcription: Pinyin;
    native: Pinyin;
    transcriptionMatchedIndices: number[][];
    transcriptionMissedIndices: number[][];
    nativeMatchedIndices: number[][];
    nativeMissedIndices: number[][];
  };
};
