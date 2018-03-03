#!/bin/bash
set -e

if [[ -n "$WEBDAV_URL" ]] && [[ -n "$WEBDAV_USERNAME" ]] && [[ -n "$WEBDAV_PASSWORD" ]]; then
	echo "Mounting $WEBDAV_URL"
else
	echo "Not all required environment variables are set"
	exit 1
fi

echo "$WEBDAV_URL /webdav davfs user,noauto,uid=root,file_mode=600,dir_mode=700 0 1" >> /etc/fstab
echo "/webdav $WEBDAV_USERNAME \"$WEBDAV_PASSWORD\"" >> /etc/davfs2/secrets

mount -t davfs /webdav
echo "Mounted!"

trap "echo TRAPed signal" HUP INT QUIT TERM

cd /bookcaster
rackup --env production

umount /webdav
echo "Unmounted!"
