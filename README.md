node-pie
========

*If only everything were this easy*

## What?

node-pie is a Node.js library and CLI app for executing REST requests from within editors. It provides a simple language for declaring requests intuitively. It looks like this:

```php
# this line is a comment.

# below is a header:
Host: https://serenity.io

# "Host" is a required header that specifies the server to which all the
# following requests should be sent. You can specify it multiple times,
# and the closest one *above* the request will be used

# below, we have a basic GET request:
GET /ships/serenity/manifest

# Bodies of requests are any series of non-blank lines after the request;
# we may provide more conveniences in the future, but JSON works well for now:
POST /ships/serenity/cargo
{
    "id": "bobble-headed-geisha-dolls"
}

# this is a variable:
$ship = "serenity"

# variables work a lot like they do in other languages; we currently support
# string an integer variables, but that could expand in the future.

# variables can be used in most places you'd expect:
GET /ships/$ship/crew

# Like headers, you can declare a variable multiple times, and the closest
# one *above* the request will be used. Variables and headers declared
# *below* a request are not considered for that request!

# this is an environment:
@core-planet:
    # variables and headers declared in an environment will only be
    # used if you have chosen that environment, making it easy
    # to switch between production and development targets, for example

    # NOTE: the whitespace is significant, but it can be any kind you
    # like, so long as the lines are all indented!
    Authorization: mreynolds

# $ENV is a special variable for choosing the active environment. Headers
# and variables declared in an environment are only used in/available to
# a request if that environment is active
$ENV = "core-planet"

# You can activate multiple environments by separating their names with
# commas. If multiple environments declare the same header or variable,
# the one declared lower in the file will be used.
$ENV = "core-planet,serenity,firefly"
```
