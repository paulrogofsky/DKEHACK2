__author__ = 'Paul'

import requests
from datetime import datetime

if __name__ == '__main__':
    session = requests.Session()
    groups_request = session.get('https://api.groupme.com/v3/groups', params={'token': 'a12fd33016f60133a58c36d16114805d'})
    groups_data = groups_request.json()['response']
    groups_json = {}
    for group in groups_data:
        group_id = group['group_id']
        group_name = group['name']
        group_users_json = {}
        group_messages_json = []
        group_pictures_json = []
        message_count = group['messages']['count']
        counter = 0
        messages_request_params = {'token': 'a12fd33016f60133a58c36d16114805d', 'limit': 100}
        while counter < message_count:
            messages_request = session.get('https://api.groupme.com/v3/groups/%s/messages' % group_id, params = messages_request_params)
            messages_data = messages_request.json()['response']['messages']
            message_id = ''
            for message in messages_data:
                message_user_id = message['user_id']
                message_user_name = message['name']
                group_users_json[message_user_id] = message_user_name
                message_text = message['text']
                message_timestamp = message['created_at']
                message_datetime = datetime.fromtimestamp(message_timestamp / 1e3)
                message_favorited_ids = message['favorited_by']
                message_pictures = message['attachments']
                message_id = message['id']
                for pic in message_pictures:
                    if pic['type'] == 'image':
                        group_pictures_json = pic['url']
                group_messages_json += message_pictures
                group_messages_json.append({
                    'id': message_id,
                    'user_id': message_user_id,
                    'text': message_text,
                    'datetime': message_datetime.strftime('%a, %b %d %Y at %X'),
                    'favorited': message_favorited_ids,
                    'pictures': message_pictures
                })
                counter += 1
            messages_request_params['before_id'] = message_id
            break
        groups_json[group_id] = {
            'users': group_users_json,
            'name': group_name,
            'messages': group_messages_json,
            'pictures': group_pictures_json
        }
    print groups_json