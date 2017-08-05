### Up, the Up1 command-line client

    Usage: up [options] [files]
    
    Upload files and text to an Up1 based pastebin. If no argument is specified, stdin is assumed.
    
    Options:
      -b, --binary                             force application/octet-stream (for downloadable file)
      -t, --text                               force text/plain (for pastebin)
      -f, --file <name>                        force file name for stdin based inputs
      -m, --mime <mime>                        force given mime type (default: detect)
      -s, --server <https://example.com:443>   specify Up1 server (default: https://up1.ca)
      -k, --apikey <key>                       specify server api key (default: c61540b5ceecd05092799f936e27755f)
      -d, --delurl                             print the deletion url
          --version                            display version information and exit
          --help                               display this help and exit


### Usage examples

Paste command output to Up1:

    ps aux | up

Copy an image file to Up1:

    up image.png

Take a screenshot (using a selection rectangle), send it to Up1, and put the result link on the clipboard:

    import png:- | up | xsel -b

Do the same as above, but also notify when complete:

    import png:- | up | tee >(xsel -b) >(xargs notify-send "Upload Complete")

### Up1

For more information on Up1, view the README at https://github.com/Upload/Up1
