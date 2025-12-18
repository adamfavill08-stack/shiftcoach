-- Add date_of_birth and age columns to profiles table
-- Age will be calculated from date_of_birth

DO $$
BEGIN
  -- Add date_of_birth column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'date_of_birth'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN date_of_birth DATE;
    
    COMMENT ON COLUMN public.profiles.date_of_birth IS 'User date of birth (YYYY-MM-DD format)';
  END IF;
  
  -- Add age column if it doesn't exist (will be calculated from date_of_birth)
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'age'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN age INTEGER CHECK (age >= 13 AND age <= 120);
    
    COMMENT ON COLUMN public.profiles.age IS 'User age in years (calculated from date_of_birth)';
  END IF;
END $$;

-- Create a function to calculate age from date_of_birth
CREATE OR REPLACE FUNCTION calculate_age_from_dob(dob DATE)
RETURNS INTEGER AS $$
BEGIN
  IF dob IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN EXTRACT(YEAR FROM AGE(dob))::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a trigger to automatically update age when date_of_birth changes
CREATE OR REPLACE FUNCTION update_age_from_dob()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.date_of_birth IS NOT NULL THEN
    NEW.age := calculate_age_from_dob(NEW.date_of_birth);
  ELSE
    NEW.age := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists, then create it
DROP TRIGGER IF EXISTS trigger_update_age_from_dob ON public.profiles;
CREATE TRIGGER trigger_update_age_from_dob
  BEFORE INSERT OR UPDATE OF date_of_birth ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_age_from_dob();

-- Update existing rows to calculate age from date_of_birth if age is null
UPDATE public.profiles
SET age = calculate_age_from_dob(date_of_birth)
WHERE date_of_birth IS NOT NULL AND age IS NULL;

-- Create a function to update all user ages (call this daily to update ages on birthdays)
CREATE OR REPLACE FUNCTION update_all_user_ages()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.profiles
  SET age = calculate_age_from_dob(date_of_birth)
  WHERE date_of_birth IS NOT NULL
    AND (
      -- Update if age is null
      age IS NULL
      OR
      -- Update if it's the user's birthday (month and day match today)
      (EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
       AND EXTRACT(DAY FROM date_of_birth) = EXTRACT(DAY FROM CURRENT_DATE)
       AND age != calculate_age_from_dob(date_of_birth))
    );
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_all_user_ages() TO authenticated;
GRANT EXECUTE ON FUNCTION update_all_user_ages() TO service_role;

-- If pg_cron extension is available, schedule daily age updates at midnight
-- Uncomment the following if you have pg_cron enabled:
/*
SELECT cron.schedule(
  'update-user-ages-daily',
  '0 0 * * *', -- Run at midnight every day
  $$SELECT update_all_user_ages();$$
);
*/

