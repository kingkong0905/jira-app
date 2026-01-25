import React from 'react';
import { Text, Linking, TextStyle } from 'react-native';

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export interface LinkifyOptions {
    linkStyle?: TextStyle;
    textStyle?: TextStyle;
}

/**
 * Detects URLs in text and returns clickable links
 */
export function linkifyText(text: string, options: LinkifyOptions = {}): React.ReactNode[] {
    const parts = text.split(URL_REGEX);
    
    return parts.map((part: string, index: number) => {
        if (part.match(URL_REGEX)) {
            return (
                <Text
                    key={index}
                    style={[{ color: '#0052CC', textDecorationLine: 'underline' }, options.linkStyle]}
                    onPress={() => Linking.openURL(part)}
                >
                    {part}
                </Text>
            );
        }
        return <Text key={index} style={options.textStyle}>{part}</Text>;
    });
}

/**
 * Check if a string contains URLs
 */
export function hasLinks(text: string): boolean {
    return URL_REGEX.test(text);
}

/**
 * Extract all URLs from text
 */
export function extractUrls(text: string): string[] {
    return text.match(URL_REGEX) || [];
}
