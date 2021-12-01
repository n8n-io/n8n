export type ScrapingBeeAdditionalOptions = Partial<{
  method: 'get' | 'post';
  block_targets: Array<'block_ads' | 'block_resources'>;
  cookies: string;
  country_code: string;
  custom_google: boolean;
  device: 'desktop' | 'mobile';
  extract_rules: string; // json
  headers: {
    headerValues: Array<{ key: string; value: string }>
  };
  js_scenario: string; // json
  json_response: boolean;
  premium_proxy: boolean;
  render_js: boolean;
  return_page_source: boolean;
  screenshot_size: 'screenshot_full_page' | 'screenshot';
  transparent_status_code: boolean;
  wait: number;
  wait_for: number;
  window_height: number;
  window_width: number;
}>;