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


@app.post('/transcribe')
def transcribe() -> Resp:
    if (mp3 := request.files.get('file')) is None:
        return {'Invalid post body': 'Missing key "file"'}, 400
    else:
        saved_mp3_name = 'transcribe_source.mp3'
        with open(saved_mp3_name, 'wb') as fp:
            mp3.save(fp)
        transcription = model.transcribe(
            saved_mp3_name,
            language='zh',
            initial_prompt='以下是普通话的句子'  # "the following are sentences in Mandarin"
        )
        content = transcription['text'].replace('?', '\uff1f')
        words = [w for w in jieba.cut(content, cut_all=False) if hi.has_chinese(w)]
        pinyin = ' '.join(
            char_to_pinyin_engine.get_pinyin(word, splitter='', tone_marks='marks') for word in words
        )
        pinyin = pinyin.capitalize()
        if content.endswith('\uff1f') and not pinyin.endswith('?'):
            pinyin = f'{pinyin}?'
        elif content.endswith('\u3002') and not pinyin.endswith('.'):
            pinyin = f'{pinyin}.'
        elif content.endswith('\uff01') and not pinyin.endswith('!'):
            pinyin = f'{pinyin}!'

        print('content:', content)
        print('words  :', ', '.join(words))
        print('pinyin :', pinyin)

        return jsonify({
            'transcription': {'content': content, 'pinyin': pinyin}
        })
