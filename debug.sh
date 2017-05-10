grunt debug 2> >(tee >(grep -o -m 1 "chrome-devtools.*" | xclip -selection c))
