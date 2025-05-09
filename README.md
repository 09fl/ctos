# ctos
[colorful toy] OS -- The shell of my personal website

## Introduction

Run `build.py`. 

(Except it probably won't work for the first time, so let me explain in detail.)

`ctos/`: Contains all files needed for the front-end. Has one CSS, one JavaScript, and some fonts and icons for A E S T H E T I C reasons.

`index.html`: The boilerplate HTML file. It's actually very easy to write your own since `<body>` is empty (the DOM tree is constructed dynamically).

`build.py`: The builder script to generate file system structure, copy necessary files and transform them if needed.

`requirements.txt`: Dependencies for the Python script. 

`counter.js`: A [Cloudflare Pages Function](https://developers.cloudflare.com/pages/functions/) implements a simple visitor counter, frequently seen in the 2000s web. It's not required, but since I really love Cloudflare (and its generous free-tier limits) I'll just leave it there.
 
 * DISCLAIMER: This project is not sponsored by Cloudflare
 * DISCLAIMER 2: As of 2025/4/20 I hold Cloudflare stocks and/or (bullish) options.

## The file system

The build script generates a tree-like structure representing the file system. By default it looks under the `contents/` directory for 3 types of entities.

### Folder

This one represents a folder in the original filesystem, nothing special. The difference is that you can customize it using `metadata`.

`metadata` is a file contains a list of key-value pairs, like this:

```
key1: value1
key2: value2, value3, another value
```

which can be used to customize its appearance and behavior (like `desktop.ini`).

### Iframe

This one represents a standalone app in a single folder. It must have an `index.html` file as the entry point. It can also be customized, but must in HTML comment format:

```
<!-- key: value, value2 -->
```

These comments must appear at the beginning of the file.

Other than that, it can have internal and external dependencies as well as other fancy things. The whole folder (including its sub-folders, if any) will be copied as-is and `index.html` will be rendered in an `<iframe>`, separated from other parts of the site.

### Html

This one includes not only HTML files but also files that can be transformed into a single HTML file, like Markdown and media files.

The contents of the HTML file will be rendered directly in a window, so there is no need to make it complete. 

For Markdown files, the build script will automatically parse them into HTML files.

For media files supported by HTML5, the build script will add corresponding HTML stubs for playing them in browsers.

The HTML files may include `<script>`. However, unlike Iframe where each instance runs in a separated namespace, special care is needed to make sure different HTML files do not interfere each other. 

In short, all JavaScript codes shall be encapsulated in `function main(root)` so it would not contaminate the global namespace. Upon loaded, the function would be called once, with the DOMElement representing the newly created window be the only argument `root`. Any code residing outside of `function main(root)`, including external libraries, would result in undefined behavior.

Since `main()` is not being run in a separated environment, it can still access `document` as well as other global variables. That makes all kinds of script injection possible. On the other hand, if you are serious about programming in JS you should use Iframe instead of Html.

## Aesthetic Remarks

TBD

## No Generative AI Statement

This developer assures that no generative AI was used in this project, including but not limited to codes, documents, arts etc. 

For boosting productivity and eliminating bugs, we suggest wearing [Programming Socks](https://www.amazon.com/s?k=programming+socks) according to results from this [paper](https://www.sigbovik.org/2024/proceedings.pdf).
