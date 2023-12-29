import { FC, useEffect, useReducer, useState } from "react";
import {
  chakra,
  ChakraProvider,
  Grid,
  GridItem,
  Heading,
  IconButton,
  Link as ChakraLink,
  Spinner,
  Text,
  Tooltip,
  theme,
} from "@chakra-ui/react";
import {
  BrowserRouter,
  Link as RouterLink,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { AlertTriangle, Mic, Pause } from "react-feather";
import {
  getSentence,
  getSentenceAudio,
  getSentences,
  transcribe,
} from "./sentences-api-client";
import { LocationState, Sentence, TranscriptionResponse } from "./types";
import { useReactMediaRecorder } from "react-media-recorder-2";

// TODO
// factor out these comments file into todo
// factor out components?
// future: word, pinyin hover highlight alignment
// future: word level pinyin, meaning hovering on content!
// future: word level audio alignment
// future: fine tune whisper model on existing known audio transcriptions?

const DEBUG_GRID = false;
const BORDER_SIZE = DEBUG_GRID ? "1px" : "0px";
const INITIALLY_SET_RECORDED_AUDIO_TO_NATIVE_AUDIO = false;

interface TranscribedValueProps {
  recordedAudio: string | undefined;
  transcriptionResponse: TranscriptionResponse | null;
  kind: "content" | "pinyin";
  fontSize: string;
}

const TranscribedValue: FC<TranscribedValueProps> = (
  props: TranscribedValueProps
) => {
  if (props.recordedAudio === undefined) {
    return <Text fontSize="6xl"></Text>;
  } else if (props.transcriptionResponse == null) {
    return <Spinner></Spinner>;
  } else {
    // If contents match, we mark both content and pinyin as green, to not introduce
    // errors based in the way we translate transcribed content to pinyin.
    const contentsMatch =
      props.transcriptionResponse.content.transcription ===
      props.transcriptionResponse.content.native;
    const transcription = props.transcriptionResponse[props.kind].transcription;
    const matchedIndices =
      props.transcriptionResponse[
        props.kind
      ].transcriptionMatchedIndices.flat();
    const missedIndices =
      props.transcriptionResponse[props.kind].transcriptionMissedIndices.flat();
    return (
      <Text fontSize={props.fontSize}>
        {transcription.split("").map((char, index) => {
          if (contentsMatch || matchedIndices.includes(index)) {
            return <chakra.span color="teal">{char}</chakra.span>;
          } else if (missedIndices.includes(index)) {
            return <chakra.span color="red">{char}</chakra.span>;
          } else {
            return <chakra.span color="black">{char}</chakra.span>;
          }
        })}
      </Text>
    );
  }
};

interface AudioPlayerProps {
  src: string | undefined;
  desc: string;
}

const AudioPlayer: FC<AudioPlayerProps> = (props: AudioPlayerProps) => {
  return (
    <>
      <Text fontSize="xs">{props.desc}</Text>
      <audio controls src={props.src}></audio>
    </>
  );
};

const SentenceView: FC = () => {
  const locationState = useLocation().state as LocationState;
  const [sentence, setSentence] = useState<Sentence | null>(null);
  const [nativeAudio, setNativeAudio] = useState<string | undefined>(undefined);
  const [recordedAudio, setRecordedAudio] = useState<string | undefined>(
    undefined
  );
  const [recording, toggleRecording] = useReducer(
    (recording) => !recording,
    false
  );
  const [recordButtonColor, setRecordButtonColor] = useState("teal");
  const [recordIcon, setRecordIcon] = useState(<Mic />);
  const [transcriptionResponse, setTranscriptionResponse] =
    useState<TranscriptionResponse | null>(null);
  const [speakHint, setSpeakHint] = useState("");

  const { status, startRecording, stopRecording, mediaBlobUrl } =
    useReactMediaRecorder({
      audio: true,
      askPermissionOnMount: true,
    });

  useEffect(() => {
    if (recording) {
      if (status !== "recording") {
        startRecording();
        setSpeakHint("Wait a moment ...");
        setRecordButtonColor("yellow");
        setRecordIcon(<AlertTriangle />);
        setTimeout(() => {
          setSpeakHint("Speak!");
          setRecordButtonColor("red");
          setRecordIcon(<Pause />);
        }, 500); // half a second
        console.log("starting recording");
      }
    } else {
      if (status === "recording") {
        stopRecording();
        setSpeakHint("");
        console.log("stopping recording");
      }
      setRecordButtonColor("teal");
      setRecordIcon(<Mic />);
    }
  }, [recording]);

  useEffect(() => {
    setSentence(null);
    setNativeAudio(undefined);
    setRecordedAudio(undefined);
    setTranscriptionResponse(null);
  }, [locationState]);

  useEffect(() => {
    if (locationState != null)
      getSentence(locationState.index).then((data) => setSentence(data));
  }, [locationState]);

  useEffect(() => {
    if (locationState != null) {
      getSentenceAudio(locationState.index).then((data) => {
        if (data != null) {
          const url = URL.createObjectURL(data);
          setNativeAudio(url);
        }
      });
    }
  }, [locationState]);

  useEffect(() => {
    if (INITIALLY_SET_RECORDED_AUDIO_TO_NATIVE_AUDIO && locationState != null) {
      getSentenceAudio(locationState.index).then((data) => {
        if (data != null) {
          const url = URL.createObjectURL(data);
          setRecordedAudio(url);
        }
      });
    }
  }, [locationState]);

  useEffect(() => {
    if (locationState != null && !recording) {
      setRecordedAudio(mediaBlobUrl);
    }
  }, [mediaBlobUrl]);

  useEffect(() => {
    if (locationState != null && recordedAudio != undefined) {
      setTranscriptionResponse(null);
      transcribe(locationState.index, recordedAudio)
        .then((data) => setTranscriptionResponse(data))
        .catch(() => alert("Failed to transcribe."));
    }
  }, [locationState, recordedAudio]);

  if (locationState == null) {
    return (
      <Grid
        templateRows={`repeat(5, 1fr)`}
        templateColumns="repeat(1, 1fr)"
        textAlign="center"
        height="100vh"
      >
        <GridItem rowSpan={2} colSpan={1}></GridItem>
        <GridItem rowSpan={1} colSpan={1}>
          <p>No sentence selected</p>
        </GridItem>
        <GridItem rowSpan={2} colSpan={1}></GridItem>
      </Grid>
    );
  } else {
    if (sentence != null) {
      return (
        <Grid
          templateRows={`repeat(8, 1fr)`}
          templateColumns="repeat(5, 1fr)"
          textAlign="center"
          height="100vh"
          borderRadius={BORDER_SIZE}
        >
          <GridItem
            rowSpan={1}
            colSpan={5}
            border={`${BORDER_SIZE} solid #000`}
          ></GridItem>
          <GridItem
            rowSpan={1}
            colSpan={5}
            border={`${BORDER_SIZE} solid #000`}
          >
            <Text fontSize="6xl">{sentence.content}</Text>
          </GridItem>
          <GridItem
            rowSpan={1}
            colSpan={5}
            border={`${BORDER_SIZE} solid #000`}
          >
            <Text fontSize="4xl">{sentence.pinyin}</Text>
          </GridItem>
          <GridItem
            rowSpan={1}
            colSpan={5}
            border={`${BORDER_SIZE} solid #000`}
          >
            <Tooltip label={sentence.meaning} aria-label="Meaning Hover">
              Hover here for meaning
            </Tooltip>
          </GridItem>
          <GridItem
            rowSpan={1}
            colSpan={1}
            border={`${BORDER_SIZE} solid #000`}
          ></GridItem>
          <GridItem
            rowSpan={1}
            colSpan={1}
            border={`${BORDER_SIZE} solid #000`}
          >
            <AudioPlayer src={nativeAudio} desc="Play Native Audio" />
          </GridItem>
          <GridItem
            rowSpan={1}
            colSpan={1}
            border={`${BORDER_SIZE} solid #000`}
          >
            <Text fontSize="xs">Record Audio</Text>
            <IconButton
              isRound={true}
              variant="solid"
              colorScheme={recordButtonColor}
              aria-label="Record Audio"
              fontSize="20px"
              icon={recordIcon}
              onClick={toggleRecording}
            />
            <Text fontSize="xs">{speakHint}</Text>
          </GridItem>
          <GridItem
            rowSpan={1}
            colSpan={1}
            border={`${BORDER_SIZE} solid #000`}
          >
            <AudioPlayer src={recordedAudio} desc="Play Recorded Audio" />
          </GridItem>
          <GridItem
            rowSpan={1}
            colSpan={1}
            border={`${BORDER_SIZE} solid #000`}
          ></GridItem>
          <GridItem
            rowSpan={1}
            colSpan={5}
            border={`${BORDER_SIZE} solid #000`}
          >
            <TranscribedValue
              recordedAudio={recordedAudio}
              transcriptionResponse={transcriptionResponse}
              kind="pinyin"
              fontSize="4xl"
            />
          </GridItem>
          <GridItem
            rowSpan={1}
            colSpan={5}
            border={`${BORDER_SIZE} solid #000`}
          >
            <TranscribedValue
              recordedAudio={recordedAudio}
              transcriptionResponse={transcriptionResponse}
              kind="content"
              fontSize="6xl"
            />
          </GridItem>
          <GridItem
            rowSpan={1}
            colSpan={5}
            border={`${BORDER_SIZE} solid #000`}
          ></GridItem>
        </Grid>
      );
    } else {
      return (
        <Grid
          templateRows={`repeat(5, 1fr)`}
          templateColumns="repeat(1, 1fr)"
          textAlign="center"
          height="100vh"
        >
          <GridItem rowSpan={2} colSpan={1}></GridItem>
          <GridItem rowSpan={1} colSpan={1}>
            <p>Sentence loading ...</p>
          </GridItem>
          <GridItem rowSpan={2} colSpan={1}></GridItem>
        </Grid>
      );
    }
  }
};

const SentenceNav: FC = () => {
  const [sentences, setSentences] = useState<Sentence[]>([]);

  useEffect(() => {
    getSentences().then((data) => {
      setSentences(data);
    });
  }, []);

  return (
    <div style={{ textAlign: "center" }}>
      <Heading height="10vh">Sentences</Heading>
      <nav>
        <ul
          style={{
            listStyle: "none",
            overflow: "hidden",
            overflowY: "scroll",
            height: "90vh",
          }}
        >
          {sentences.map((sentence) => (
            <ChakraLink key={sentence.index}>
              <RouterLink
                key={sentence.index}
                to={`/${sentence.content}`}
                state={{ index: sentence.index }}
              >
                <li>{sentence.content}</li>
              </RouterLink>
            </ChakraLink>
          ))}
        </ul>
      </nav>
    </div>
  );
};

const ShadowingApp: FC = () => {
  return (
    <Grid
      templateRows={`repeat(1, 1fr)`}
      templateColumns="repeat(5, 1fr)"
      borderRadius="10px"
    >
      <GridItem rowSpan={1} colSpan={1} border="1px solid #000">
        <SentenceNav />
      </GridItem>
      <GridItem rowSpan={1} colSpan={4} border="1px solid #000">
        <SentenceView />
      </GridItem>
    </Grid>
  );
};

export const App: FC = () => {
  return (
    <ChakraProvider theme={theme}>
      <BrowserRouter>
        <Routes>
          <Route path="/:content?" element={<ShadowingApp />} />
        </Routes>
      </BrowserRouter>
    </ChakraProvider>
  );
};
