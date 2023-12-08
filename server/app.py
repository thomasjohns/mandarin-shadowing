import difflib as diff
import functools
import json
import os

import hanzidentifier as hi
import jieba
import whisper
from flask import Flask
from flask import jsonify
from flask import request
from flask import send_file
from flask.typing import ResponseReturnValue as Resp
from flask_cors import CORS
from xpinyin import Pinyin


app = Flask(__name__)
CORS(app, resources={r'*': {'origins': 'http://localhost:3000'}})

with open('sentences.json') as fp:
    SENTS = json.load(fp)

INDEX_TO_SENT = {sent['index']: sent for sent in SENTS}


get_audio_path = functools.partial(os.path.join, 'audio')

model = whisper.load_model('small')  # tiny, base, small, medium, large
char_to_pinyin_engine = Pinyin()


@app.get('/sentences')
def get_sentences() -> Resp:
    return jsonify(SENTS)


@app.get('/sentences/<int:index>')
def get_sentence(index: int) -> Resp:
    if index in INDEX_TO_SENT:
        return jsonify(INDEX_TO_SENT[index])
    else:
        return {'Sentence not found for index': index}, 404


@app.get('/sentences/<int:index>/audio')
def get_sentence_audio(index: int) -> Resp:
    if index in INDEX_TO_SENT:
        sent = INDEX_TO_SENT[index]
        return send_file(get_audio_path(sent['audio']), as_attachment=True)
    else:
        return {'Sentence audio not found for index': index}, 404


@app.post('/sentences/<int:index>/transcribe')
def transcribe(index: int) -> Resp:
    if (sent := INDEX_TO_SENT.get(index)) is None:
        return {'Sentence audio not found for index': index}, 404
    elif (mp3 := request.files.get('file')) is None:
        return {'Invalid post body': 'Missing key "file"'}, 400
    else:
        saved_mp3_name = 'transcribe_source.mp3'
        with open(saved_mp3_name, 'wb') as fp:
            mp3.save(fp)

        native_content = sent['content']
        native_pinyin = sent['pinyin']

        transcription = model.transcribe(
            saved_mp3_name,
            language='zh',
            # "the following are sentences in Mandarin"
            #initial_prompt='以下是普通话的句子'
            # "the following sentence is in Mandarin and will be similar or the same as
            #  the sentence ..."
            initial_prompt=f'以下句子是普通话，与该句子相似或相同{native_content}'
        )
        transcribed_content = transcription['text'].replace('?', '\uff1f')
        transcribed_words = [
            w for w in jieba.cut(transcribed_content, cut_all=False)
            if hi.has_chinese(w)
        ]
        transcribed_pinyin = ' '.join(
            char_to_pinyin_engine.get_pinyin(transcribed_word, splitter='', tone_marks='marks')
            for transcribed_word in transcribed_words
        )
        transcribed_pinyin = transcribed_pinyin.capitalize()
        if transcribed_content.endswith('\uff1f') and not transcribed_pinyin.endswith('?'):
            transcribed_pinyin = f'{transcribed_pinyin}?'
        elif transcribed_content.endswith('\u3002') and not transcribed_pinyin.endswith('.'):
            transcribed_pinyin = f'{transcribed_pinyin}.'
        elif transcribed_content.endswith('\uff01') and not transcribed_pinyin.endswith('!'):
            transcribed_pinyin = f'{transcribed_pinyin}!'

        matched_content_indices = match_indices(transcribed_content, native_content)
        transcribed_content_matched = matched_content_indices[0]
        transcribed_content_missed = matched_content_indices[1]
        native_content_matched = matched_content_indices[2]
        native_content_missed = matched_content_indices[3]

        matched_pinyin_indices = match_indices(transcribed_pinyin, native_pinyin)
        transcribed_pinyin_matched = matched_pinyin_indices[0]
        transcribed_pinyin_missed = matched_pinyin_indices[1]
        native_pinyin_matched = matched_pinyin_indices[2]
        native_pinyin_missed = matched_pinyin_indices[3]

        print('content:', transcribed_content)
        print('words  :', ', '.join(transcribed_words))
        print('pinyin :', transcribed_pinyin)

        return jsonify({
            'content': {
                'transcription': transcribed_content,
                'native': native_content,
                'transcriptionMatchedIndices': transcribed_content_matched,
                'transcriptionMissedIndices': transcribed_content_missed,
                'nativeMatchedIndices': native_content_matched,
                'nativeMissedIndices': native_content_missed,
            },
            'pinyin': {
                'transcription': transcribed_pinyin,
                'native': native_pinyin,
                'transcriptionMatchedIndices': transcribed_pinyin_matched,
                'transcriptionMissedIndices': transcribed_pinyin_missed,
                'nativeMatchedIndices': native_pinyin_matched,
                'nativeMissedIndices': native_pinyin_missed,
            },
        })


def match_indices(a: str, b: str) -> tuple[list[int], list[int]]:
    a_matched_indices: list[int] = []
    all_a_matched_indices: list[int] = []
    b_matched_indices: list[int] = []
    all_b_matched_indices: list[int] = []

    sequence_matcher = diff.SequenceMatcher()
    sequence_matcher.set_seqs(a, b)
    matches = sequence_matcher.get_matching_blocks()

    for match in matches:
        new_a_matched_indices = list(range(match.a, match.a + match.size))
        a_matched_indices.append(new_a_matched_indices)
        all_a_matched_indices.extend(new_a_matched_indices)

        new_b_matched_indices = list(range(match.b, match.b + match.size))
        b_matched_indices.append(new_b_matched_indices)
        all_b_matched_indices.extend(new_b_matched_indices)

    a_missed_indices = [i for i, _ in enumerate(a) if i not in all_a_matched_indices]
    b_missed_indices = [i for i, _ in enumerate(a) if i not in all_b_matched_indices]
    return a_matched_indices, a_missed_indices, b_matched_indices, b_missed_indices
