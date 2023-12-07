import { FC, useEffect, useReducer, useState } from "react";
import {
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
import { Mic, Pause } from "react-feather";
import {
  getSentence,
  getSentenceAudio,
  getSentences,
  transcribe,
} from "./sentences-api-client";
import { LocationState, Sentence, Transcription } from "./types";

// TODO
// record audio
// pass index to transcribe: so we can compute transcription differences server side
//   transcription comparison
// factor out these comments file into todo
// factor out components
// git push everything
// future: word, pinyin hover highlight alignment
// future: word level pinyin, meaning hovering on content!
// future: word level audio alignment

const DEBUG_GRID = false;
const BORDER_SIZE = DEBUG_GRID ? "1px" : "0px";
const INITIALLY_SET_RECORDED_AUDIO_TO_NATIVE_AUDIO = true;

interface TranscribedValueProps {
  recordedAudio: string | undefined;
  transcription: Transcription | null;
}

const TranscribedContent: FC<TranscribedValueProps> = (
  props: TranscribedValueProps
) => {
  if (props.recordedAudio === undefined) {
    return <Text fontSize="6xl"></Text>;
  } else if (props.transcription == null) {
    return <Spinner></Spinner>;
  } else {
    return <Text fontSize="6xl">{props.transcription.content}</Text>;
  }
};

const TranscribedPinyin: FC<TranscribedValueProps> = (
  props: TranscribedValueProps
) => {
  if (props.recordedAudio === undefined) {
    return <Text fontSize="4xl"></Text>;
  } else if (props.transcription == null) {
    return <Spinner></Spinner>;
  } else {
    return <Text fontSize="4xl">{props.transcription.pinyin}</Text>;
  }
};

const SentenceView: FC = () => {
  let locationState = useLocation().state as LocationState;
  let [sentence, setSentence] = useState<Sentence | null>(null);
  let [nativeAudio, setNativeAudio] = useState<string | undefined>(undefined);
  let [recordedAudio, setRecordedAudio] = useState<string | undefined>(
    undefined
  );
  let [recording, toggleRecording] = useReducer(
    (recording) => !recording,
    false
  );
  let [recordButtonColor, setRecordButtonColor] = useState("teal");
  let [recordIcon, setRecordIcon] = useState(<Mic />);
  let [transcription, setTranscription] = useState<Transcription | null>(null);

  useEffect(() => {
    if (recording) {
      setRecordButtonColor("red");
      setRecordIcon(<Pause />);
    } else {
      setRecordButtonColor("teal");
      setRecordIcon(<Mic />);
    }
  }, [recording]);

  useEffect(() => {
    setSentence(null);
    setNativeAudio(undefined);
    setRecordedAudio(undefined);
    setTranscription(null);
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
    if (recordedAudio != null) {
      transcribe(recordedAudio).then((data) =>
        setTranscription(data.transcription)
      );
    }
  }, [recordedAudio]);

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
            <Text fontSize="xs">Play Native Audio</Text>
            <audio controls src={nativeAudio}></audio>
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
          </GridItem>
          <GridItem
            rowSpan={1}
            colSpan={1}
            border={`${BORDER_SIZE} solid #000`}
          >
            <Text fontSize="xs">Play Recorded Audio</Text>
            <audio controls src={recordedAudio}></audio>
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
            <TranscribedPinyin
              recordedAudio={recordedAudio}
              transcription={transcription}
            />
          </GridItem>
          <GridItem
            rowSpan={1}
            colSpan={5}
            border={`${BORDER_SIZE} solid #000`}
          >
            <TranscribedContent
              recordedAudio={recordedAudio}
              transcription={transcription}
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
            <ChakraLink>
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
