### Up, the Upload command-line client

    Usage: up [options] [files]
    
    Upload files and text to an Upload based pastebin. If no argument is specified, stdin is assumed.
    
    Options:
      -b, --binary        force application/octet-stream
      -f, --file <name>   force file name for stdin based inputs
      -m, --mime <mime>   force given mime type (default: detect)
          --version       display version information and exit
          --help          display this help and exit
    
### Usage examples

Paste command output to Upload:

    ps aux | up

Copy an image file to Upload:

    up image.png

Take a screenshot (using a selection rectangle), send it to Upload, and put the Upload link on the clipboard:

    import png:- | up | xsel -b

### Upload

For more information on Upload, view the readme at https://github.com/Upload/Upload
