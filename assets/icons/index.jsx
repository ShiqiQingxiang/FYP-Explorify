import { View, Text } from 'react-native'
import React from 'react'
import Home from './Home';
import Mail from './Mail';
import Lock from './Lock';
import User from './User';
import Heart from './Heart';
import Plus from './Plus';
import Search from './Search';
import Location from './Location';
import Call from './Call';
import { theme } from '../../constants/theme';
import Camera from './Camera';
import Edit from './Edit';
import ArrowLeft from './ArrowLeft';
import ThreeDotsCircle from './ThreeDotsCircle';
import ThreeDotsHorizontal from './ThreeDotsHorizontal';
import Comment from './Comment';
import Share from './Share';
import Send from './Send';
import Delete from './Delete';
import Logout from './logout';
import Image from './Image';
import Video from './Video';
import Eye from './Eye';
import Star from './Star';
import Award from './Award';
import Map from './Map';
import Globe from './Globe';
import Clock from './Clock';
import Ticket from './Ticket';
import Phone from './Phone';
import AlertTriangle from './AlertTriangle';
import MessageCircle from './MessageCircle';
import Navigation from './Navigation';
import MoreHorizontal from './MoreHorizontal';

const icons = {
    home: Home,
    mail: Mail,
    lock: Lock,
    user: User,
    heart: Heart,
    plus: Plus,
    search: Search,
    location: Location,
    call: Call,
    camera: Camera,
    edit: Edit,
    arrowLeft: ArrowLeft,
    threeDotsCircle: ThreeDotsCircle,
    threeDotsHorizontal: ThreeDotsHorizontal,
    comment: Comment,
    share: Share,
    send: Send,
    delete: Delete,
    logout: Logout,
    image: Image,
    video: Video,
    eye: Eye,
    star: Star,
    award: Award,
    map: Map,
    globe: Globe,
    clock: Clock,
    ticket: Ticket,
    phone: Phone,
    "alert-triangle": AlertTriangle,
    "message-circle": MessageCircle,
    "navigation": Navigation,
    "more-horizontal": MoreHorizontal,
}

const Icon = ({name, ...props}) => {
    const IconComponent = icons[name];
    
    // 如果找不到对应的图标组件，使用一个备用图标或返回null
    if (!IconComponent) {
      console.warn(`Icon with name "${name}" not found. Fallback to default icon.`);
      return <ThreeDotsCircle 
        height={props.size || 24}
        width={props.size || 24}
        strokeWidth={props.strokeWidth || 1.9}
        color={props.color || theme.colors.textLight}
      />;
    }
    
    return (
      <IconComponent
        height={props.size || 24}
        width={props.size || 24}
        strokeWidth={props.strokeWidth || 1.9}
        color={theme.colors.textLight}
        {...props}
      />
    )
}

export default Icon;
