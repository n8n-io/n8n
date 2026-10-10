# Measure Docker image efficiency

Use the `image-efficiency:*` Playwright projects to measure built images with Dive 0.13.1.
These projects use the existing artifact and metrics reporters. They do not start a browser or n8n instance.

## Before you start

- Install Dive 0.13.1 from its [release](https://github.com/wagoodman/dive/releases/tag/v0.13.1).
- Start Docker.
- Use existing local images, or build current images with `DOCKER_BUILD_DISTROLESS=true pnpm build:docker`.
  Redirect build output to a log file.

## Run the measurements

1. Run all three image projects from the repository root:

   ```bash
   pnpm --filter=@n8n/efficiency test:images
   ```

   To measure only n8n, select its project:

   ```bash
   pnpm --filter=@n8n/efficiency exec playwright test --project=image-efficiency:n8n
   ```

   The defaults are `n8nio/n8n:local`, `n8nio/runners:local`, and `n8nio/runners:local-distroless`.
   Override them with `TEST_IMAGE_N8N`, `TEST_IMAGE_RUNNERS`, and `TEST_IMAGE_RUNNERS_DISTROLESS`.
   Use `DIVE_BINARY` if Dive is not on your `PATH`.

2. Open the Playwright report:

   ```bash
   pnpm --filter=@n8n/efficiency report
   ```

3. Read `image-efficiency-summary` for layer sizes and the largest wasted files.
   Use `dive-report` for the full file inventory.
   Use `image-identity` to confirm the image ID, platform, and Dive version.
   Open the command step to read stdout, stderr, and the exit status when analysis fails.
   Image, platform, and Dive version annotations appear on the test result.

4. Compare results for the same image type, platform, and Dive version.
   The metrics reporter sends measurements when the `QA_METRICS_WEBHOOK_*` variables are configured.

   - `docker-image-layer-size-<image>` measures uncompressed layer content in MiB.
   - `docker-image-wasted-size-<image>` measures Dive's estimated wasted content in MiB.
   - `docker-image-efficiency-<image>` records Dive's efficiency score as a percentage.
   - `docker-image-layer-count-<image>` records the number of filesystem layers.

   Layer size is not registry download size or final filesystem size.
   A high efficiency score can still describe a large image.

## CI results

Run `Test: Image Efficiency` through GitHub Actions with a manual dispatch.
The standalone workflow prepares or restores the cached n8n and runners images on amd64.
Run the distroless project locally when that image is available.
The image job uploads a Playwright report and test attachments.
Currents stores results and attachments when its record key is configured.

Measurements have no size or waste budgets yet. Analysis errors and invalid reports fail the test.
Dive's JSON export bypasses its CI rules, so `.dive-ci` does not enforce budgets in these projects.
