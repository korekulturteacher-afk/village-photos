-- Add phone number field to download_requests table
ALTER TABLE download_requests
ADD COLUMN IF NOT EXISTS user_phone TEXT;

-- Add index for phone number searches
CREATE INDEX IF NOT EXISTS idx_download_requests_phone
ON download_requests(user_phone);

-- Add comment
COMMENT ON COLUMN download_requests.user_phone IS 'User phone number for contact purposes';
