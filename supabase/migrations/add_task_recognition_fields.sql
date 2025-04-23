-- 为tourist_spots表添加任务识别相关字段
ALTER TABLE public.tourist_spots
ADD COLUMN IF NOT EXISTS task_model_name TEXT,
ADD COLUMN IF NOT EXISTS task_requirements JSONB;

-- 创建用户任务表
CREATE TABLE IF NOT EXISTS public.user_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  task_id UUID REFERENCES tourist_spots(id) NOT NULL,
  completed BOOLEAN DEFAULT false,
  image_url TEXT,
  verified BOOLEAN DEFAULT false,
  confidence DECIMAL(5,2),
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, task_id)
);

-- 为现有景点添加任务识别要求 (示例数据)
UPDATE public.tourist_spots
SET 
  task_model_name = 'forbidden-city-detection',
  task_requirements = '["imperial palace", "red wall", "golden roof"]'::JSONB
WHERE name = 'Forbidden City';

UPDATE public.tourist_spots
SET 
  task_model_name = 'great-wall-detection',
  task_requirements = '["wall section", "watchtower", "mountains"]'::JSONB
WHERE name = 'Great Wall';

UPDATE public.tourist_spots
SET 
  task_model_name = 'terracotta-army-detection',
  task_requirements = '["warrior", "terracotta", "formation"]'::JSONB
WHERE name = 'Terracotta Army';

UPDATE public.tourist_spots
SET 
  task_model_name = 'west-lake-detection',
  task_requirements = '["lake", "pagoda", "bridge"]'::JSONB
WHERE name = 'West Lake'; 