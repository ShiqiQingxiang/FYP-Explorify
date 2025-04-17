# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

# Explorify

这是一个移动旅游探索应用程序，允许用户发现世界各地的景点并与其他旅行者互动。

## Supabase 数据库配置

### 消息功能的数据库结构

为了实现应用中的聊天功能，需要在Supabase中配置以下表和函数：

#### 表结构

1. **conversations** - 存储对话
```sql
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

2. **conversation_participants** - 存储对话参与者
```sql
CREATE TABLE public.conversation_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (conversation_id, user_id)
);
```

3. **messages** - 存储消息
```sql
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 索引

```sql
-- 用于提高会话查询性能的索引
CREATE INDEX idx_conversation_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);

-- 用于提高消息查询性能的索引
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
```

#### 存储过程

**find_or_create_conversation** - 查找或创建两个用户之间的对话
```sql
CREATE OR REPLACE FUNCTION public.find_or_create_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    existing_conversation_id UUID;
    new_conversation_id UUID;
BEGIN
    -- 检查是否已经存在包含这两个用户的对话
    SELECT c.id INTO existing_conversation_id
    FROM conversations c
    JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = user1_id
    JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = user2_id
    WHERE 
        (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = c.id) = 2
    LIMIT 1;
    
    -- 如果存在，则返回现有对话ID
    IF existing_conversation_id IS NOT NULL THEN
        RETURN existing_conversation_id;
    END IF;
    
    -- 否则，创建一个新对话
    INSERT INTO conversations DEFAULT VALUES
    RETURNING id INTO new_conversation_id;
    
    -- 添加参与者
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (new_conversation_id, user1_id), (new_conversation_id, user2_id);
    
    RETURN new_conversation_id;
END;
$$;
```

#### 实时订阅权限

配置Supabase实时功能以支持消息的实时订阅：

1. 启用conversations表的实时功能
2. 启用messages表的实时功能
3. 设置适当的安全策略，只允许对话参与者访问相关消息

### RLS (Row Level Security) 策略

为保护用户数据安全，添加以下RLS策略：

```sql
-- Conversations 表策略
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可以查看自己参与的对话"
    ON public.conversations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = id AND user_id = auth.uid()
        )
    );

-- Conversation_participants 表策略
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可以查看对话参与者"
    ON public.conversation_participants
    FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = conversation_participants.conversation_id 
            AND user_id = auth.uid()
        )
    );

-- Messages 表策略
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户可以查看自己参与对话的消息"
    ON public.messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = messages.conversation_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "用户可以发送消息到自己参与的对话"
    ON public.messages
    FOR INSERT
    WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = messages.conversation_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "用户可以更新自己消息的已读状态"
    ON public.messages
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM conversation_participants
            WHERE conversation_id = messages.conversation_id 
            AND user_id = auth.uid()
        )
    )
    WITH CHECK (
        (sender_id = auth.uid()) OR
        (read IS NOT NULL AND
         EXISTS (
             SELECT 1 FROM conversation_participants
             WHERE conversation_id = messages.conversation_id 
             AND user_id = auth.uid()
         ))
    );
```
