import { supabase } from '../lib/supabase';
import { uploadFile } from './imageService';

export const createOrUpdatePost = async (post) => {
    try {
        if(post.file && typeof post.file === 'object'){
            let isImage = post?.file?.type == 'image';
            let folderName = isImage ? 'postImages' : 'postVideos';
            let fileResult = await uploadFile(folderName, post?.file?.uri, isImage);
            if(fileResult.success){
                post.file = fileResult.data;
            } else {
                return fileResult;
            }
        }

        const {data, error} = await supabase
        .from('posts')
        .insert(post)
        .select()
        .single();
        
        if(error){
            console.log('createPost error: ', error);
            return {success: false, msg: 'Could not create your post'};
        }
        return {success: true, data: data};

    } catch (error) {
        console.log('createPost error: ', error);
        return {success: false, msg: 'Could not create your post'};
    }   
}

// Update existing post
export const updatePost = async (postId, postData) => {
    try {
        // If there's a new file to be uploaded
        if(postData.file && typeof postData.file === 'object'){
            let isImage = postData?.file?.type == 'image';
            let folderName = isImage ? 'postImages' : 'postVideos';
            let fileResult = await uploadFile(folderName, postData?.file?.uri, isImage);
            if(fileResult.success){
                postData.file = fileResult.data;
            } else {
                return fileResult;
            }
        }

        const {data, error} = await supabase
            .from('posts')
            .update(postData)
            .eq('id', postId)
            .select()
            .single();
        
        if(error){
            console.log('updatePost error: ', error);
            return {success: false, msg: 'Could not update your post'};
        }
        return {success: true, data: data};
    } catch (error) {
        console.log('updatePost error: ', error);
        return {success: false, msg: 'Could not update your post'};
    }
}

// Delete a post
export const deletePost = async (postId) => {
    try {
        const {error} = await supabase
            .from('posts')
            .delete()
            .eq('id', postId);
        
        if(error){
            console.log('deletePost error: ', error);
            return {success: false, msg: 'Could not delete your post'};
        }
        return {success: true};
    } catch (error) {
        console.log('deletePost error: ', error);
        return {success: false, msg: 'Could not delete your post'};
    }
}

export const getAllPosts = async () => {
    try {
        const { data, error } = await supabase
            .from('posts')
            .select(`
                *,
                profiles:userId (
                    id,
                    name,
                    image
                )
            `)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.log('getAllPosts error: ', error);
            return { success: false, msg: 'Could not retrieve posts' };
        }
        
        return { success: true, data: data };
    } catch (error) {
        console.log('getAllPosts error: ', error);
        return { success: false, msg: 'Error while retrieving posts' };
    }
}

// Get posts by user ID
export const getUserPosts = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('posts')
            .select(`
                *,
                profiles:userId (
                    id,
                    name,
                    image
                )
            `)
            .eq('userId', userId)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.log('getUserPosts error:', error);
            return { success: false, msg: 'Could not retrieve your posts' };
        }
        
        return { success: true, data: data };
    } catch (error) {
        console.log('getUserPosts error:', error);
        return { success: false, msg: 'Error while retrieving your posts' };
    }
}

// Check if user has liked a post
export const checkPostLike = async (postId, userId) => {
    try {
        const { data, error } = await supabase
            .from('postLikes')
            .select('*')
            .eq('postId', postId)
            .eq('userId', userId)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 is no records found error
            console.log('Check like status error:', error);
            return { success: false, msg: 'Error checking like status' };
        }
        
        return { success: true, isLiked: !!data };
    } catch (error) {
        console.log('Check like status error:', error);
        return { success: false, msg: 'Error checking like status' };
    }
}

// Toggle like status
export const togglePostLike = async (postId, userId) => {
    try {
        // Check if already liked
        const { data, error } = await supabase
            .from('postLikes')
            .select('*')
            .eq('postId', postId)
            .eq('userId', userId);
        
        if (error) {
            console.log('Check like error:', error);
            return { success: false, msg: 'Error processing like' };
        }
        
        // If already liked, remove like
        if (data && data.length > 0) {
            const { error: deleteError } = await supabase
                .from('postLikes')
                .delete()
                .eq('postId', postId)
                .eq('userId', userId);
            
            if (deleteError) {
                console.log('Unlike error:', deleteError);
                return { success: false, msg: 'Error unliking post' };
            }
            
            return { success: true, isLiked: false, msg: 'Post unliked' };
        } 
        // If not liked, add like
        else {
            const { error: insertError } = await supabase
                .from('postLikes')
                .insert({ postId, userId });
            
            if (insertError) {
                console.log('Like error:', insertError);
                return { success: false, msg: 'Error liking post' };
            }
            
            return { success: true, isLiked: true, msg: 'Post liked' };
        }
    } catch (error) {
        console.log('Like operation error:', error);
        return { success: false, msg: 'Error processing like' };
    }
}

// Get post likes count
export const getPostLikesCount = async (postId) => {
    try {
        const { count, error } = await supabase
            .from('postLikes')
            .select('*', { count: 'exact', head: true })
            .eq('postId', postId);
        
        if (error) {
            console.log('Get likes count error:', error);
            return { success: false, msg: 'Error getting likes count' };
        }
        
        return { success: true, count };
    } catch (error) {
        console.log('Get likes count error:', error);
        return { success: false, msg: 'Error getting likes count' };
    }
}

// Get user's liked posts
export const getUserLikedPosts = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('postLikes')
            .select(`
                postId,
                posts:postId (
                    *,
                    profiles:userId (
                        id,
                        name,
                        image
                    )
                )
            `)
            .eq('userId', userId)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.log('Get liked posts error:', error);
            return { success: false, msg: 'Error retrieving liked posts' };
        }
        
        // Extract posts data
        const likedPosts = data.map(item => item.posts);
        
        return { success: true, data: likedPosts };
    } catch (error) {
        console.log('Get liked posts error:', error);
        return { success: false, msg: 'Error retrieving liked posts' };
    }
}

// Add comment
export const addComment = async (postId, userId, text) => {
    try {
        const { data, error } = await supabase
            .from('comments')
            .insert({
                postId,
                userId,
                text
            })
            .select(`
                *,
                profiles:userId (
                    id,
                    name,
                    image
                )
            `)
            .single();
        
        if (error) {
            console.log('Add comment error:', error);
            return { success: false, msg: 'Error adding comment' };
        }
        
        return { success: true, data };
    } catch (error) {
        console.log('Add comment error:', error);
        return { success: false, msg: 'Error adding comment' };
    }
}

// Get post comments
export const getPostComments = async (postId) => {
    try {
        const { data, error } = await supabase
            .from('comments')
            .select(`
                *,
                profiles:userId (
                    id,
                    name,
                    image
                )
            `)
            .eq('postId', postId)
            .order('created_at', { ascending: true });
        
        if (error) {
            console.log('Get comments error:', error);
            return { success: false, msg: 'Error retrieving comments' };
        }
        
        return { success: true, data };
    } catch (error) {
        console.log('Get comments error:', error);
        return { success: false, msg: 'Error retrieving comments' };
    }
}
