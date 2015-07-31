__author__ = 'Paul'

import os
import requests
import csv

# store access tokens below, add users here
access_tokens = {
    'paul': 'a12fd33016f60133a58c36d16114805d'
}

# start up request session below to save cookies
session = requests.Session()

def ascii(x):
    """
    Converts x to an ascii string
    :param x: parameter to be converted (usually a unicode string)
    :return: an ascii string
    """
    return '' if x is None else x.encode('ascii','ignore') if isinstance(x,unicode) else str(x.decode('ascii','ignore'))


def loadGroupsToCSV(access_name):
    """
    Load from GroupMe API into a CSV file the id and name of all the groups you are in
    :param str access_name:
    :return: Nothing, void function
    """
    token = access_tokens[access_name]
    # remove file path, and then recreate file (no overwriting)
    filename = os.path.join('data_files', '%sGroups.csv' % access_name)
    os.remove(filename)
    with open(filename, 'wb') as groups_file:
        csv_writer = csv.writer(groups_file, delimiter = ',')
        # get data from GroupMe API- write it to CSV
        groups_request = session.get('https://api.groupme.com/v3/groups', params = {'token': token})
        groups_data = groups_request.json()['response']
        csv_writer.writerow(['id', 'name', 'message_count'])
        for group in groups_data:
            csv_writer.writerow([ascii(group['id']), ascii(group['name']), group['messages']['count']])

def get_users(users_filename):
    """
    Get users from the CSV file
    :param str users_filename: The name of the users file to get the users from
    :return dict: Mapping of user ids to user names
    """
    users = {}
    with open(users_filename, 'rb') as users_file:
        csv_users_reader = csv.DictReader(users_file, ',')
        for row in csv_users_reader:
            users[row['id']] = users[row['name']]
    return users

def requestMessages(message_writer, picture_writer, token, group_id, users, message_id, most_recent):
    """
    Get Messages from the GroupMe API and store the messages and pictures in the CSV and users in the dictionary
    :param csv.DictWriter message_writer: csv file container to write messages to
    :param csv.DictWriter picture_writer: csv writer container to write pictures to
    :param str token: Access Token to group me api
    :param int group_id: Group id to get the messages from
    :param dict users: key-value pair dictionary of users (ids to names map which we are updating)
    :param int message_id:
    :param bool most_recent: Indicator of whether we get the most
    :return: Nothing, void function
    """
    # update request parameters for GroupMe API- if most recent, get after message id; if not most recent, get before message id
    request_params = {'token': token, 'limit': 100}
    if message_id and most_recent:
        request_params['after_id'] = message_id
    elif message_id and not most_recent:
        request_params['before_id'] = message_id
    # error- can't get most recent if there is no message id-> which indicates we don't have any messages
    elif (not message_id) and most_recent:
        return
    messages_request = session.get('https://api.groupme.com/v3/groups/%s/messages' % group_id, params = request_params)
    response_data = messages_request.json()['response']
    # if no messages-> let's exit function
    if response_data['count'] == 0:
        return
    message_id = None
    for message in response_data['messages']:
        attachments = message['attachments']
        message_id = message['id']
        user_id = message['user_id']
        # only add users that are not there or we are loading a new name from the past (past names are better than current)
        if (user_id not in users) or (user_id in users and not most_recent):
            users[user_id] = users['name']
        # load in pictures, and write them
        pictures = []
        for attach in attachments:
            if attach['type'] == 'image':
                pictures.append(attach['url'])
                picture_writer.writerow({'url': attach['url'], 'message_id': message_id})
        # notice that favorited and pictures are going to be space-delimited fields in csv file (user ids for favorite and urls for pics)
        message_writer.writerow({
            'id': message_id,
            'user': user_id,
            'text': message['text'],
            'datetime': message['created_at'],
            'favorited': ' '.join(message['favorited_by']),
            'pictures': ' '.join(pictures)
        })
    # indicator that there are more messages-> number of messages = 100 and there are message_id != None (preset)
    if message_id and response_data['count'] == 100:
        requestMessages(message_writer, picture_writer, token, group_id, users, message_id, most_recent)


def handleMessages(access_name, group_id):
    """
    Instead of overloading the GroupMe API, we are going to intelligently load all messages not already loaded into the CSV through this method
    :param str access_name: The name of the person trying to access the GroupMeAPI and load in messages
    :param str group_id: The id of the group that the user wants to get messages for
    :return: Nothing, void function
    """
    token = access_tokens[access_name]
    # get file names below, Note: we are writing to temp files then renaming them at the end of the function
    messages_filename = os.path.join('data_files', '%s%sMessages.csv' % (access_name, group_id))
    pictures_filename = os.path.join('data_files', '%s%sPictures.csv' % (access_name, group_id))
    temp_messages_filename = os.path.join('data_files', 'temp_messages.csv')
    temp_pictures_filename = os.path.join('data_files', 'temp_pictures.csv')
    users_filename = os.path.join('data_files', '%s%sUsers.csv' % (access_name, group_id))
    users = get_users(users_filename)
    # open up the files
    with open(messages_filename, 'rb'), open(temp_messages_filename , 'wb'), open(pictures_filename, 'rb'), open(temp_pictures_filename, 'wb') as (old_messages_file, new_messages_file, old_pictures_file, temp_pictures_file):
        # create the messages and pictures readers/writers below (write header too)
        csv_messages_reader = csv.DictReader(old_messages_file, ',')
        csv_messages_writer = csv.DictWriter(new_messages_file, fieldnames = ['id', 'user_id', 'text', 'datetime', 'favorited', 'pictures'])
        csv_messages_writer.writeheader()
        csv_pictures_reader = csv.DictReader(old_pictures_file, ',')
        csv_pictures_writer = csv.DictWriter(temp_pictures_file, fieldnames = ['url', 'message_id'])
        csv_pictures_writer.writeheader()
        most_recent = True
        lastMessage = None
        for row in csv_messages_reader:
            # the first message is the most recent one we got (we will keep it that way by searching for messages after the first messag)
            if most_recent:
                requestMessages(csv_messages_writer, csv_pictures_writer, token, group_id, users, row['id'], True)
                most_recent = False
            # then continue writing all the messages found in the body
            csv_messages_writer.writerow(row)
            lastMessage = row
        # just write everything to the csv pictures, nothing fancy here (previous function loads more recent pictures than body)
        csv_pictures_writer.writerows(csv_pictures_reader)
        # lastly, we try to load all messages that occurred before the last message (most distant in past)
        requestMessages(csv_messages_writer, csv_pictures_writer, token, group_id, lastMessage['id'] if lastMessage else None, users, most_recent)
        # rename files when we are done writing to them
        os.rename(temp_messages_filename, messages_filename)
        os.rename(temp_pictures_filename, pictures_filename)
    # remove users file, and then let's completely rewrite it with the users we found (not so much data so okay to do)
    os.remove(users_filename)
    with open(users_filename, 'wb') as users_file:
        csv_users_writer = csv.DictWriter(users_file, fieldnames = ['id', 'name'])
        csv_users_writer.writeheader()
        for id, name in users:
            csv_users_writer.writerow({'id': id, 'name': name})

if __name__ == '__main__':
    # ensure data_files folder exists for storing data
    if not os.path.exists('data_files'):
        os.makedirs('data_files')
    # TODO argparse
    # TODO testing
    # TODO mongolab uploading from CSV
    # make sure everything in ascii
    pass
