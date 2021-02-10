#!/bin/bash
set -e

if [[ -n "$S3_ENDPOINT_URL" ]] && [[ -n "$ACCESS_KEY_ID" ]] && [[ -n "$AWS_SECRET_ACCESS_KEY" ]]; then
	echo "Mounting $S3_ENDPOINT_URL"
else
	echo "Not all required environment variables are set"
	exit 1
fi

echo "$ACCESS_KEY_ID:$AWS_SECRET_ACCESS_KEY" > /etc/passwd-s3fs
chmod 600 /etc/passwd-s3fs
# Create a symlink so that path in the older entries.yaml files from when audiofiles were hosted
# by transip.nl still work.
mkdir -p /webdav
ln -s /audiobooks /webdav/audiobooks

s3fs icloud:/audiobooks /audiobooks -o passwd_file=/etc/passwd-s3fs -o url=$S3_ENDPOINT_URL -o nosuid,nonempty,nodev,allow_other,use_path_request_style,default_acl=private

echo "Mounted!"

trap "echo TRAPed signal" HUP INT QUIT TERM

cd /bookcaster
rackup --env production

umount /audiobooks
echo "Unmounted!"
