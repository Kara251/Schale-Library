# Schale Library

[简体中文](../zh-Hans/README.md) | [日本語](../ja/README.md)

## Overview

Schale Library is a system for collecting and organizing content related to *Blue Archive*, including external works, events, and reference materials.

Library URL: [https://bakivo.com](https://bakivo.com)

## Tech Stack

- **Full-stack framework:** [React](https://github.com/facebook/react) + [Next.js](https://github.com/vercel/next.js) App Router + [TypeScript](https://github.com/microsoft/TypeScript)
- **Styling:** [Shadcn/UI](https://github.com/shadcn-ui/ui) + [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss)
- **CMS:** [Strapi](https://github.com/strapi/strapi)
- **API:** Strapi REST API
- **Data processing:** Next.js Route Handlers
- **Media:** [Cloudinary](https://cloudinary.com) + [OpenList](https://github.com/OpenListTeam/OpenList) + OneDrive
- **Development assistance:** Claude, ChatGPT, Gemini, and other AI tools were used during design, coding, review, and documentation work.

## Local Development

- This project uses a pnpm workspace and does not require Docker.
- Install dependencies: `pnpm install`
- Start Strapi: `pnpm dev:backend`
- Start the frontend: `pnpm dev:frontend`
- Bilibili RSS sync reads local RSSHub first by default: `http://localhost:1200`. To run RSSHub locally, install and start it from the `RSSHub/` directory following RSSHub's official instructions, then keep `RSSHUB_URL=http://localhost:1200` in `backend/.env`.
- The custom admin panel is available at `/{locale}/manage`. It uses same-origin Next.js Route Handlers and HttpOnly cookie sessions to access Strapi, and includes content maintenance, Bilibili subscription sync, uploads, and sync logs.

## Deployment

Deployment, database, and maintainer account recovery notes are available in [Deployment Notes](deployment.md).

## Copyright

- **Code:** Source code in this repository is licensed under the [MIT License](../../LICENSE).
- **Assets:** All original or officially derived game assets used in this project, including but not limited to character artwork, icons, voice, text, and UI design, belong to **Nexon Games**, **Yostar**, and related rights holders. This project respects the official fan content guidelines.
- **Non-commercial statement:** This is a non-commercial fan project for organizing and displaying related content. If a rights holder requests removal, the project will comply.
- **Fonts:** BlueakaBeta2GBK is from [Kivotos Library](https://kivo.wiki), and Noto Sans JP is from [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans+JP).
