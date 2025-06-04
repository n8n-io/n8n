# InmoSuperApp Node

A versatile n8n node for processing different types of media - resize images, adjust text font size, and prepare for audio/video volume adjustment.

## Features

- **Auto-detect** input type (image, video, audio, text)
- **Image processing**: Resize, scale, and convert format
- **Text processing**: Change font size, transform case, output as HTML/Markdown
- **Audio/Video**: Placeholder for volume adjustment (requires ffmpeg integration)

## Installation

### 1. Install Dependencies

For image processing, install the `sharp` package:

```bash
cd packages/nodes-base
npm install sharp
```

### 2. Register the Node

Add the following line to the `nodes` array in `packages/nodes-base/package.json`:

```json
"dist/nodes/InmoSuperApp/InmoSuperApp.node.js",
```

### 3. Build the Project

From the root directory:

```bash
pnpm build
```

## Usage

1. Add the "Inmo Super App" node to your workflow
2. Configure the input type (or use Auto Detect)
3. Set the appropriate options based on your input type:
   - **Images**: Width, height, scale, format, quality
   - **Text**: Font size, font family, text transform, output format
   - **Audio/Video**: Volume adjustment settings (placeholder)

## Node Properties

### Input Type
- **Auto Detect**: Automatically detects the input type
- **Image**: Process image files
- **Video**: Process video files (placeholder)
- **Audio**: Process audio files (placeholder)
- **Text**: Process text content

### Image Options
- **Width/Height**: New dimensions in pixels (0 to keep aspect ratio)
- **Scale**: Scale factor (1 = original size)
- **Format**: JPEG, PNG, WebP, or keep original
- **Quality**: Output quality for JPEG/WebP (1-100)

### Text Options
- **Font Size**: Size in points
- **Font Family**: Font family name
- **Text Transform**: None, uppercase, lowercase, capitalize
- **Output Format**: Plain text, HTML, or Markdown

### Audio/Video Options
- **Volume Adjustment**: Percentage or decibels
- **Normalize Audio**: Whether to normalize audio levels

## Binary Data

For image, video, and audio inputs, the node expects binary data in the specified property (default: "data").

## Example Workflow

```json
{
  "nodes": [
    {
      "parameters": {
        "inputType": "auto",
        "imageOptions": {
          "width": 800,
          "format": "webp",
          "quality": 85
        }
      },
      "name": "Inmo Super App",
      "type": "n8n-nodes-base.inmoSuperApp",
      "position": [450, 300]
    }
  ]
}
```

## Notes

- Video and audio processing currently returns placeholder data
- Full video/audio processing would require integrating ffmpeg or similar tools
- The TypeScript linting errors shown in VS Code are due to local configuration and should resolve during the build process

## Development

To modify this node:
1. Edit `InmoSuperApp.node.ts`
2. Run `pnpm dev` in the nodes-base package to watch for changes
3. Restart n8n to see the changes

## Icon

The node uses a custom icon located at:
`packages/frontend/editor-ui/public/static/inmoSuperAppIcon.svg`

Make sure this file exists before using the node. 