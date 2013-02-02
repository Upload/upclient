Client to the 3d3.ca pastebin.

For a passworded paste, use the `-p` flag:
    cat file.txt | 3d3 -p password

For a regular paste, use no flags:
    cat file.txt | 3d3

If you want specific syntax highlighting, use the `-h` flag:
    cat file.txt | 3d3 -h python

You can also combine both:
    cat file.txt | 3d3 -p password -h python

In all cases, 3d3 will output the link to the newly created paste.

You can also use 3d3 as a paste reader:
    3d3 http://3d3.ca/abcdefg
Will output the plaintext version of the paste to stdout.

Passworded pastes can also be read:
    3d3 http://3d3.ca/abcdefg#password
This will be decrypted on the client side and output to stdout.
