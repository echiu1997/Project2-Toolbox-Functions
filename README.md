# [Project2: Toolbox Functions](https://github.com/CIS700-Procedural-Graphics/Project2-Toolbox-Functions)

## Overview

The objective of this assignment is to procedurally model and animate a bird wing.

## Modeling

##### Reference images

![](./references/wing-ref-1.jpg)

This image provided the most information to me. The first thing I observed was that the overall shape of the wing is a spline with an “S” shape. The second thing I observed was that near the side of the wing closer to the body, the wing has a slight “bump”. The third thing I observed was that there are three layers of feathers, where the top layer has the darkest color. I implemented all of these observations in my procedurally modeled wing.

![](./references/wing-ref-2.png)

This image just reassured me the general shape and feather layering I observed in the first reference image was correct.

![](./references/wing-ref-3.jpg)

The most prominent observation I made from this reference image is that orientation of feathers. As the feathers are placed farther from the body, the more “outward” it points. I also implemented this observation in my procedurally modeled wing using a toolbox gain function.

##### Make wing curve

Used two splines, curve1 and curve2 in my code, to outline the general shape of the wing. It can be drawn by uncommenting out the code in the load function. This design was based on my first reference image.

![](./references/wing-screenshot.png)

## Animation

Added wind force to the scene by rotating the feathers slightly by a sine toolbox function over time. The speed of the wind is just a modification of time of when the sine function is called.

Additionally, I animated my wing to flap by adding an additional sine function to the feather y translations. The speed, again, is just a modification of time of when the sine function is called. The flapping motion is the frequency of the sine function that is tweaked by the user.