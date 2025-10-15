-- Add user_name and user_phone columns to download_requests table
ALTER TABLE download_requests
ADD COLUMN IF NOT EXISTS user_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS user_phone VARCHAR(50);

-- Add comments for documentation
COMMENT ON COLUMN download_requests.user_name IS 'Name of the user requesting download';
COMMENT ON COLUMN download_requests.user_phone IS 'Phone number of the user requesting download';
