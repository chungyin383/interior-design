# 2D Floor Plan Interior Designer

A desktop-focused web app for placing interior objects on top of a floor plan image using real-world scale.

## Run

Because this is a static app, you can:

1. Open `index.html` directly in a browser, or
2. Use a local static server (recommended).

Example with Python:

```bash
python -m http.server 5500
```

Then open `http://localhost:5500`.

## Workflow

1. Upload a floor plan image.
2. Click **Pick 2 Points**, click two points on the image, then enter the real-world distance.
3. Add objects (rectangle/circle) with name, dimensions, and color.
4. Set rotation (degrees), then drag objects on the plan.
5. Edit or delete objects from the Objects list at any time.
6. Save/load project JSON from the Project section.
