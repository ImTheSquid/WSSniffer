#!/bin/sh

npm run build_plugin WSSniffer --prefix ../../
cp ../../release/WSSniffer.plugin.js .

# Remove all header data that is undefined
sed -i '/^ \* @.*undefined$/d' ./WSSniffer.plugin.js