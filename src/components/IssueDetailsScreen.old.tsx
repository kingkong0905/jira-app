import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    TextInput,
    KeyboardAvoidingView,
    Image,
    Linking,
    Modal,
    Dimensions,
    Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { WebView } from 'react-native-webview';
import { JiraIssue, JiraComment, JiraAttachment, JiraUser } from '../types/jira';
import { jiraApi } from '../services/jiraApi';
import { StorageService } from '../services/storage';
import { formatDate, formatDateOnly } from '../utils/helpers';
import { linkifyText } from '../utils/linkify';
import { SkeletonLoader, SkeletonText } from './shared/SkeletonLoader';
import { FadeInView } from './shared/FadeInView';
import { useToast } from './shared/ToastContext';

interface IssueDetailsScreenProps {
    issueKey: string;
    onBack: () => void;
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingTop: 50,
        paddingBottom: 15,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backButton: {
        padding: 5,
    },
    backIcon: {
        fontSize: 28,
        color: '#fff',
        fontWeight: 'bold',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    placeholder: {
        width: 38,
    },
    content: {
        flex: 1,
    },
    card: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 16,
        padding: 20,
        borderRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#E1E4E8',
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionIcon: {
        fontSize: 18,
        marginRight: 8,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    descriptionContent: {
        paddingTop: 2,
    },
    editButton: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        backgroundColor: '#F4F5F7',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    editButtonText: {
        color: '#0052CC',
        fontSize: 14,
        fontWeight: '600',
    },
    keyStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    keyContainer: {
        flexDirection: 'column',
    },
    issueKeyLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#5E6C84',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    issueKey: {
        fontSize: 24,
        fontWeight: '700',
        color: '#0052CC',
        letterSpacing: 0.3,
    },
    divider: {
        height: 1,
        backgroundColor: '#E1E4E8',
        marginVertical: 18,
    },
    sectionDivider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginVertical: 12,
    },
    statusBadge: {
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 1,
    },
    statusText: {
        fontSize: 11,
        color: '#fff',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#172B4D',
        letterSpacing: 0.2,
    },
    summary: {
        fontSize: 20,
        color: '#172B4D',
        fontWeight: '600',
        lineHeight: 30,
        letterSpacing: 0.1,
    },
    description: {
        fontSize: 15,
        color: '#42526E',
        lineHeight: 24,
    },
    descriptionParagraph: {
        fontSize: 15,
        color: '#42526E',
        lineHeight: 24,
        marginBottom: 14,
    },
    heading1: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#172B4D',
        marginTop: 20,
        marginBottom: 12,
        lineHeight: 32,
    },
    heading2: {
        fontSize: 21,
        fontWeight: 'bold',
        color: '#172B4D',
        marginTop: 18,
        marginBottom: 10,
        lineHeight: 28,
    },
    heading3: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#172B4D',
        marginTop: 16,
        marginBottom: 8,
        lineHeight: 24,
    },
    heading4: {
        fontSize: 16,
        fontWeight: '600',
        color: '#172B4D',
        marginTop: 14,
        marginBottom: 8,
        lineHeight: 22,
    },
    heading5: {
        fontSize: 15,
        fontWeight: '600',
        color: '#172B4D',
        marginTop: 12,
        marginBottom: 6,
        lineHeight: 20,
    },
    listContainer: {
        marginBottom: 14,
        marginTop: 4,
    },
    listItemContainer: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    listBullet: {
        fontSize: 15,
        color: '#42526E',
        marginRight: 4,
        minWidth: 16,
    },
    listItemContent: {
        flex: 1,
    },
    listItemText: {
        fontSize: 15,
        color: '#42526E',
        lineHeight: 22,
    },
    nestedList: {
        marginLeft: 20,
        marginTop: 4,
    },
    descriptionImageContainer: {
        marginVertical: 14,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#F4F5F7',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    descriptionImage: {
        width: '100%',
        height: 250,
    },
    descriptionImagePlaceholder: {
        width: '100%',
        height: 250,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F4F5F7',
    },
    descriptionImagePlaceholderText: {
        marginTop: 10,
        fontSize: 14,
        color: '#5E6C84',
    },
    descriptionVideoContainer: {
        marginVertical: 14,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#F4F5F7',
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    descriptionVideoPlaceholder: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000',
    },
    descriptionVideoIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    descriptionVideoText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 8,
    },
    descriptionVideoHint: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
    },
    mediaGroupContainer: {
        marginVertical: 14,
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: 14,
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 32,
    },
    detailIconLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 0.4,
    },
    detailIcon: {
        fontSize: 16,
        marginRight: 8,
    },
    detailLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#5E6C84',
        letterSpacing: 0.2,
    },
    detailValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 0.6,
        justifyContent: 'flex-end',
        paddingVertical: 6,
        paddingHorizontal: 10,
        marginRight: -10,
        borderRadius: 8,
        backgroundColor: 'rgba(0, 82, 204, 0.02)',
    },
    detailValue: {
        fontSize: 15,
        color: '#172B4D',
        fontWeight: '500',
        textAlign: 'right',
        flex: 1,
    },
    detailValueStatic: {
        fontSize: 14,
        color: '#5E6C84',
        fontWeight: '500',
        textAlign: 'right',
        flex: 0.6,
    },
    chevron: {
        fontSize: 20,
        color: '#8993A4',
        marginLeft: 8,
        fontWeight: '300',
    },
    unassignedText: {
        fontStyle: 'italic',
        color: '#8993A4',
        fontWeight: '400',
    },
    priorityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    priorityEmoji: {
        fontSize: 16,
        marginRight: 6,
    },
    assigneeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    assigneeClickable: {
        flex: 1,
        paddingVertical: 4,
        paddingHorizontal: 6,
        marginLeft: -6,
        borderRadius: 6,
        backgroundColor: 'rgba(0, 82, 204, 0.03)',
    },
    changeIndicator: {
        fontSize: 16,
        marginLeft: 6,
        opacity: 0.6,
    },
    assigneeModalContent: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        width: '85%',
        maxHeight: '75%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    assigneeModalTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 18,
        textAlign: 'center',
        color: '#172B4D',
        letterSpacing: 0.2,
    },
    assigneeList: {
        maxHeight: 400,
    },
    assigneeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E1E4E8',
    },
    assigneeItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    assigneeInfo: {
        marginLeft: 12,
        flex: 1,
    },
    assigneeName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#172B4D',
    },
    assigneeEmail: {
        fontSize: 13,
        color: '#5E6C84',
        marginTop: 2,
    },
    selectedIndicator: {
        fontSize: 18,
        color: '#0052CC',
        marginLeft: 8,
    },
    assigneeLoadingContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    unassignedAvatar: {
        backgroundColor: '#DFE1E6',
    },
    assigneeAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
    },
    searchInput: {
        backgroundColor: '#F4F5F7',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    linksSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    linksCountBadge: {
        backgroundColor: '#DFE1E6',
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 12,
        minWidth: 26,
        alignItems: 'center',
    },
    linksCountText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#5E6C84',
    },
    inlineAttachmentsSection: {
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    attachmentsTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    attachmentIcon: {
        fontSize: 16,
        marginRight: 8,
    },
    inlineAttachmentsTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#172B4D',
        letterSpacing: 0.2,
        flex: 1,
    },
    attachmentCountBadge: {
        backgroundColor: '#DFE1E6',
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 12,
        minWidth: 26,
        alignItems: 'center',
    },
    attachmentCountText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#5E6C84',
    },
    inlineAttachmentsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    inlineAttachmentItem: {
        width: 100,
        backgroundColor: '#F4F5F7',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#DFE1E6',
        padding: 8,
        alignItems: 'center',
    },
    inlineAttachmentImage: {
        width: 84,
        height: 84,
        borderRadius: 6,
        marginBottom: 6,
        resizeMode: 'cover',
    },
    inlineAttachmentPlaceholder: {
        width: 84,
        height: 84,
        borderRadius: 6,
        marginBottom: 6,
        backgroundColor: '#F4F5F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    inlineAttachmentFile: {
        width: 84,
        height: 84,
        borderRadius: 6,
        marginBottom: 6,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    inlineAttachmentIcon: {
        fontSize: 40,
    },
    inlineAttachmentName: {
        fontSize: 11,
        color: '#172B4D',
        textAlign: 'center',
        marginBottom: 4,
        width: '100%',
    },
    inlineAttachmentSize: {
        fontSize: 10,
        color: '#5E6C84',
        textAlign: 'center',
    },
    emptyDescription: {
        color: '#8993A4',
        fontStyle: 'italic',
        fontSize: 15,
        paddingVertical: 12,
        textAlign: 'center',
    },
    linkItem: {
        flexDirection: 'row',
        padding: 14,
        backgroundColor: '#FAFBFC',
        borderRadius: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E1E4E8',
    },
    linkIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
        borderWidth: 1,
        borderColor: '#E1E4E8',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
    },
    linkIconText: {
        fontSize: 22,
    },
    linkContent: {
        flex: 1,
        justifyContent: 'center',
    },
    linkType: {
        fontSize: 11,
        color: '#0052CC',
        fontWeight: '700',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    linkTitle: {
        fontSize: 15,
        color: '#172B4D',
        fontWeight: '600',
        marginBottom: 3,
        lineHeight: 20,
    },
    linkStatus: {
        fontSize: 13,
        color: '#5E6C84',
    },
    linkSummary: {
        fontSize: 13,
        color: '#5E6C84',
        marginTop: 4,
        lineHeight: 18,
    },
    statusModalContent: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        width: '80%',
        maxHeight: '60%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    currentStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: '#F4F5F7',
        borderRadius: 8,
        marginBottom: 12,
    },
    currentStatusLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#5E6C84',
    },
    currentStatusBadge: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
    },
    currentStatusText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    currentFieldValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#172B4D',
    },
    statusList: {
        maxHeight: 400,
    },
    statusItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E1E4E8',
    },
    currentStatusItem: {
        backgroundColor: '#F4F5F7',
        opacity: 0.7,
    },
    statusItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
    },
    statusInfo: {
        flex: 1,
    },
    statusName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#172B4D',
    },
    sprintState: {
        fontSize: 12,
        color: '#5E6C84',
        marginLeft: 8,
        fontWeight: '500',
    },
    statusDescription: {
        fontSize: 13,
        color: '#5E6C84',
        marginTop: 2,
    },
    statusLoadingContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noTransitionsText: {
        fontSize: 15,
        color: '#5E6C84',
        textAlign: 'center',
    },
    datePickerContainer: {
        marginVertical: 16,
        alignItems: 'center',
    },
    datePicker: {
        width: '100%',
        height: 200,
        marginBottom: 12,
    },
    dateInput: {
        backgroundColor: '#F4F5F7',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 15,
        borderWidth: 1,
        borderColor: '#DFE1E6',
        marginBottom: 12,
    },
    dateActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    dateButton: {
        paddingVertical: 8,
        paddingHorizontal: 20,
        backgroundColor: '#F4F5F7',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    dateButtonText: {
        fontSize: 14,
        color: '#172B4D',
        fontWeight: '600',
    },
    androidDateButton: {
        backgroundColor: '#F4F5F7',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderWidth: 1,
        borderColor: '#DFE1E6',
        marginBottom: 16,
        alignItems: 'center',
    },
    androidDateButtonText: {
        fontSize: 16,
        color: '#172B4D',
        fontWeight: '500',
    },
    storyPointsInput: {
        backgroundColor: '#F4F5F7',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 15,
        borderWidth: 1,
        borderColor: '#DFE1E6',
        marginVertical: 16,
    },
    quickPointsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        marginBottom: 16,
    },
    quickPointButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F4F5F7',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 4,
        marginVertical: 4,
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    quickPointText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#172B4D',
    },
    updateButton: {
        backgroundColor: '#0052CC',
        paddingVertical: 16,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#0052CC',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 3,
    },
    updateButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    avatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#0052CC',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    avatarText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    commentHeaderSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    replyButton: {
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    replyButtonText: {
        fontSize: 13,
        color: '#0052CC',
        fontWeight: '600',
    },
    webWarning: {
        fontSize: 14,
        color: '#5E6C84',
        lineHeight: 20,
        fontStyle: 'italic',
    },
    commentsLoader: {
        marginVertical: 20,
    },
    commentItem: {
        paddingVertical: 18,
        borderTopWidth: 1,
        borderTopColor: '#E1E4E8',
    },
    commentHeader: {
        marginBottom: 14,
    },
    commentCount: {
        fontSize: 16,
        fontWeight: '600',
        color: '#8993A4',
        marginLeft: 6,
    },
    commentAuthorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    commentAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#4C9AFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    commentAvatarImage: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 10,
    },
    commentAvatarText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    commentMeta: {
        flex: 1,
    },
    commentAuthor: {
        fontSize: 14,
        fontWeight: '600',
        color: '#172B4D',
    },
    commentDate: {
        fontSize: 12,
        color: '#5E6C84',
        marginTop: 2,
    },
    commentBody: {
        fontSize: 14,
        color: '#172B4D',
        lineHeight: 20,
        marginLeft: 42,
    },
    commentAttachmentContainer: {
        marginTop: 10,
        marginBottom: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#DFE1E6',
        overflow: 'hidden',
        backgroundColor: '#fff',
    },
    commentAttachmentImage: {
        width: '100%',
        height: 200,
        backgroundColor: '#F4F5F7',
    },
    commentAttachmentPlaceholder: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#F4F5F7',
    },
    commentAttachmentIcon: {
        fontSize: 32,
        marginRight: 12,
    },
    commentAttachmentInfo: {
        flex: 1,
    },
    commentAttachmentName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#172B4D',
        marginBottom: 4,
    },
    commentAttachmentSize: {
        fontSize: 12,
        color: '#5E6C84',
    },
    commentMediaGroup: {
        marginTop: 10,
        gap: 8,
    },
    paragraphText: {
        fontSize: 14,
        color: '#172B4D',
        lineHeight: 20,
        marginBottom: 8,
    },
    paragraphContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        marginBottom: 8,
    },
    mentionChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#DEEBFF',
        paddingVertical: 3,
        paddingHorizontal: 8,
        paddingRight: 10,
        borderRadius: 14,
        gap: 6,
        marginHorizontal: 2,
        marginVertical: 2,
    },
    mentionAvatarSmall: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#0052CC',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mentionAvatarSmallText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#fff',
    },
    mentionChipText: {
        fontSize: 14,
        color: '#0052CC',
        fontWeight: '600',
        lineHeight: 20,
    },
    mentionInlineChip: {
        backgroundColor: '#DEEBFF',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginHorizontal: 2,
        fontSize: 14,
        color: '#0052CC',
        fontWeight: '600',
    },
    mentionText: {
        color: '#0052CC',
        fontWeight: '600',
    },
    userInfoModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    userInfoModalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    userInfoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F4F5F7',
    },
    userInfoAvatarLarge: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#0052CC',
        justifyContent: 'center',
        alignItems: 'center',
    },
    userInfoAvatarText: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
    },
    userInfoCloseButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F4F5F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    userInfoCloseText: {
        fontSize: 18,
        color: '#5E6C84',
        fontWeight: '600',
    },
    userInfoBody: {
        padding: 20,
    },
    userInfoLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#5E6C84',
        textTransform: 'uppercase',
        marginTop: 16,
        marginBottom: 6,
    },
    userInfoValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#172B4D',
    },
    userInfoValueSmall: {
        fontSize: 13,
        color: '#5E6C84',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    linkText: {
        color: '#0052CC',
        textDecorationLine: 'underline',
    },
    codeBlockContainer: {
        backgroundColor: '#F4F5F7',
        borderRadius: 4,
        padding: 12,
        marginVertical: 8,
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    codeBlockText: {
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 12,
        color: '#172B4D',
        lineHeight: 18,
    },
    repliesIndicator: {
        marginLeft: 42,
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#E8EBED',
    },
    repliesCount: {
        fontSize: 12,
        color: '#5E6C84',
        fontWeight: '600',
        fontStyle: 'italic',
    },
    noComments: {
        fontSize: 14,
        color: '#A5ADBA',
        fontStyle: 'italic',
    },
    fixedCommentSection: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E8EBED',
        paddingHorizontal: 15,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 20 : 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 8,
    },
    replyIndicator: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#EAF3FF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginBottom: 8,
    },
    replyingToText: {
        fontSize: 13,
        color: '#0052CC',
        fontWeight: '600',
    },
    cancelReplyText: {
        fontSize: 18,
        color: '#5E6C84',
        fontWeight: '600',
    },
    commentInputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
    },
    commentInput: {
        flex: 1,
        backgroundColor: '#F4F5F7',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 15,
        color: '#172B4D',
        borderWidth: 1.5,
        borderColor: '#DFE1E6',
        minHeight: 44,
        maxHeight: 80,
        textAlignVertical: 'top',
    },
    postButton: {
        backgroundColor: '#0052CC',
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 12,
        minWidth: 65,
        alignItems: 'center',
        justifyContent: 'center',
        height: 44,
        shadowColor: '#0052CC',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    postButtonDisabled: {
        backgroundColor: '#A5ADBA',
        shadowOpacity: 0,
        elevation: 0,
    },
    postButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    bottomPadding: {
        height: 30,
    },
    attachmentsSection: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 15,
        marginHorizontal: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    attachmentsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#172B4D',
        marginBottom: 12,
    },
    attachmentsList: {
        gap: 10,
    },
    attachmentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#F4F5F7',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    attachmentThumbnail: {
        width: 50,
        height: 50,
        borderRadius: 4,
        marginRight: 12,
    },
    attachmentIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 4,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    editModalAttachmentIconLarge: {
        fontSize: 24,
    },
    attachmentInfo: {
        flex: 1,
    },
    attachmentFilename: {
        fontSize: 14,
        fontWeight: '500',
        color: '#172B4D',
        marginBottom: 4,
    },
    attachmentSize: {
        fontSize: 12,
        color: '#5E6C84',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: Dimensions.get('window').width * 0.98,
        height: Dimensions.get('window').height * 0.92,
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#E8EBED',
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#172B4D',
        flex: 1,
        marginRight: 10,
    },
    modalCloseButton: {
        padding: 5,
    },
    modalCloseText: {
        fontSize: 24,
        color: '#5E6C84',
        fontWeight: '400',
    },
    modalImageContainer: {
        flex: 1,
    },
    modalImageContent: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        minHeight: '100%',
    },
    modalImage: {
        width: '100%',
        height: 600,
    },
    modalPdfContainer: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    modalWebView: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    modalVideoContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalVideo: {
        width: '100%',
        height: '100%',
    },
    videoLoadingOverlay: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    videoLoadingText: {
        marginTop: 10,
        fontSize: 14,
        color: '#fff',
    },
    videoErrorOverlay: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
        padding: 20,
    },
    videoErrorIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    videoErrorText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 8,
    },
    videoErrorHint: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
    },
    imageLoadingContainer: {
        width: '100%',
        height: 400,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageLoadingText: {
        marginTop: 10,
        fontSize: 14,
        color: '#5E6C84',
    },
    errorText: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: '600',
        color: '#172B4D',
        textAlign: 'center',
    },
    errorSubtext: {
        marginTop: 8,
        fontSize: 14,
        color: '#5E6C84',
        textAlign: 'center',
    },
    openExternalButton: {
        marginTop: 24,
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#0052CC',
        borderRadius: 8,
    },
    openExternalButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    modalUnsupportedContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 300,
    },
    modalUnsupportedIcon: {
        fontSize: 64,
        marginBottom: 20,
    },
    modalUnsupportedText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#172B4D',
        textAlign: 'center',
        marginBottom: 10,
    },
    modalUnsupportedHint: {
        fontSize: 14,
        color: '#5E6C84',
        textAlign: 'center',
    },
    modalActions: {
        padding: 15,
        borderTopWidth: 1,
        borderTopColor: '#E8EBED',
    },
    modalActionButton: {
        backgroundColor: '#0052CC',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalActionText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    commentActions: {
        flexDirection: 'row',
        gap: 6,
        marginLeft: 42,
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F4F5F7',
    },
    commentActionButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#DFE1E6',
        backgroundColor: '#fff',
    },
    deleteActionButton: {
        borderColor: '#FFEBE6',
        backgroundColor: '#FFEBE6',
    },
    commentActionText: {
        fontSize: 12,
        color: '#0052CC',
        fontWeight: '600',
    },
    deleteActionText: {
        fontSize: 12,
        color: '#DE350B',
        fontWeight: '600',
    },
    editCommentContainer: {
        marginTop: 10,
    },
    editCommentInput: {
        borderWidth: 1,
        borderColor: '#DFE1E6',
        borderRadius: 6,
        padding: 10,
        fontSize: 14,
        minHeight: 80,
        maxHeight: 150,
        textAlignVertical: 'top',
    },
    editCommentActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 10,
    },
    editCancelButton: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    editCancelButtonText: {
        fontSize: 14,
        color: '#5E6C84',
        fontWeight: '600',
    },
    editSaveButton: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 6,
        backgroundColor: '#0052CC',
    },
    editSaveButtonText: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '600',
    },
    summaryInput: {
        borderWidth: 1,
        borderColor: '#DFE1E6',
        borderRadius: 6,
        padding: 12,
        fontSize: 15,
        minHeight: 70,
        maxHeight: 120,
        textAlignVertical: 'top',
        marginBottom: 15,
    },
    descriptionInput: {
        borderWidth: 1,
        borderColor: '#DFE1E6',
        borderRadius: 6,
        padding: 12,
        fontSize: 15,
        minHeight: 150,
        maxHeight: 250,
        textAlignVertical: 'top',
        marginBottom: 15,
    },
    descriptionModalContent: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        width: '90%',
        maxHeight: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    richEditorWrapper: {
        height: 400,
        marginBottom: 15,
    },
    richToolbar: {
        backgroundColor: '#F4F5F7',
        borderRadius: 6,
        marginBottom: 10,
        height: 50,
    },
    richEditorScroll: {
        flex: 1,
    },
    richEditor: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#DFE1E6',
        borderRadius: 6,
    },
    editModalAttachmentsSection: {
        marginTop: 10,
        marginBottom: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#DFE1E6',
    },
    editModalAttachmentsTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#172B4D',
        marginBottom: 10,
    },
    editModalAttachmentsScroll: {
        maxHeight: 100,
    },
    editModalAttachmentThumb: {
        width: 80,
        height: 80,
        marginRight: 10,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#F4F5F7',
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    editModalAttachmentImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    editModalAttachmentPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F4F5F7',
    },
    editModalAttachmentFile: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
    },
    editModalAttachmentIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    editModalAttachmentName: {
        fontSize: 10,
        color: '#172B4D',
        textAlign: 'center',
    },
    // Mention Suggestions Styles
    mentionSuggestionsContainer: {
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 8,
        marginHorizontal: 16,
        maxHeight: 250,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    mentionLoadingContainer: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 12,
    },
    mentionLoadingText: {
        fontSize: 14,
        color: '#5E6C84',
    },
    mentionSuggestionsList: {
        maxHeight: 250,
    },
    mentionSuggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F4F5F7',
        gap: 12,
    },
    mentionAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#DFE1E6',
    },
    mentionAvatarPlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#0052CC',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mentionAvatarText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    mentionUserInfo: {
        flex: 1,
    },
    mentionUserAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#DFE1E6',
    },
    mentionDisplayName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#172B4D',
        marginBottom: 2,
    },
    mentionEmail: {
        fontSize: 12,
        color: '#5E6C84',
    },
    mentionSuggestionsPopup: {
        maxHeight: 250,
    },
    mentionUserName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#172B4D',
        marginBottom: 2,
    },
    mentionUserEmail: {
        fontSize: 12,
        color: '#5E6C84',
    },
    mentionNoResults: {
        padding: 20,
        textAlign: 'center',
        fontSize: 14,
        color: '#5E6C84',
    },
    listItem: {
        marginBottom: 4,
    },
    modalMessage: {
        fontSize: 15,
        color: '#42526E',
        lineHeight: 22,
        marginBottom: 20,
        textAlign: 'center',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        justifyContent: 'center',
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalButtonCancel: {
        backgroundColor: '#F4F5F7',
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    modalButtonCancelText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#5E6C84',
    },
    modalButtonConfirm: {
        backgroundColor: '#DE350B',
    },
    modalButtonConfirmText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
});

function IssueDetailsScreen({ issueKey, onBack }: IssueDetailsScreenProps) {
    const [issue, setIssue] = useState<JiraIssue | null>(null);
    const [comments, setComments] = useState<JiraComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingComments, setLoadingComments] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);
    const [postingComment, setPostingComment] = useState(false);
    const [previewAttachment, setPreviewAttachment] = useState<JiraAttachment | null>(null);
    const [loadedImageData, setLoadedImageData] = useState<{ [key: string]: string }>({});
    const [loadedPdfData, setLoadedPdfData] = useState<{ [key: string]: string }>({});
    const [authHeaders, setAuthHeaders] = useState<Record<string, string>>({});
    const [videoStatus, setVideoStatus] = useState<string>('loading');
    const [showAssigneePicker, setShowAssigneePicker] = useState(false);
    const [assignableUsers, setAssignableUsers] = useState<JiraUser[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [assigningUser, setAssigningUser] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [allUsers, setAllUsers] = useState<JiraUser[]>([]);
    const [issueLinks, setIssueLinks] = useState<any[]>([]);
    const [remoteLinks, setRemoteLinks] = useState<any[]>([]);
    const [loadingLinks, setLoadingLinks] = useState(false);
    const [showStatusPicker, setShowStatusPicker] = useState(false);
    const [availableTransitions, setAvailableTransitions] = useState<any[]>([]);
    const [loadingTransitions, setLoadingTransitions] = useState(false);
    const [transitioningStatusId, setTransitioningStatusId] = useState<string | null>(null);
    const [showTypePicker, setShowTypePicker] = useState(false);
    const [availableTypes, setAvailableTypes] = useState<any[]>([]);
    const [loadingTypes, setLoadingTypes] = useState(false);
    const [updatingType, setUpdatingType] = useState(false);
    const [showPriorityPicker, setShowPriorityPicker] = useState(false);
    const [availablePriorities, setAvailablePriorities] = useState<any[]>([]);
    const [loadingPriorities, setLoadingPriorities] = useState(false);
    const [updatingPriorityId, setUpdatingPriorityId] = useState<string | null>(null);
    const [showDueDatePicker, setShowDueDatePicker] = useState(false);
    const [showAndroidDatePicker, setShowAndroidDatePicker] = useState(false);
    const [selectedDueDate, setSelectedDueDate] = useState<Date | null>(null);
    const [updatingDueDate, setUpdatingDueDate] = useState(false);
    const [showStoryPointsPicker, setShowStoryPointsPicker] = useState(false);
    const [storyPointsInput, setStoryPointsInput] = useState('');
    const [updatingStoryPoints, setUpdatingStoryPoints] = useState(false);
    const [editingSummary, setEditingSummary] = useState(false);
    const [summaryInput, setSummaryInput] = useState('');
    const [updatingSummary, setUpdatingSummary] = useState(false);
    const [editingDescription, setEditingDescription] = useState(false);
    const [descriptionInput, setDescriptionInput] = useState('');
    const [updatingDescription, setUpdatingDescription] = useState(false);
    const richEditorRef = useRef<RichEditor>(null);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editCommentText, setEditCommentText] = useState('');
    const [updatingComment, setUpdatingComment] = useState(false);
    const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
    const [deleteCommentModalVisible, setDeleteCommentModalVisible] = useState(false);
    const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [showSprintPicker, setShowSprintPicker] = useState(false);
    const [availableSprints, setAvailableSprints] = useState<any[]>([]);
    const [loadingSprints, setLoadingSprints] = useState(false);
    const [updatingSprint, setUpdatingSprint] = useState(false);
    const [boardId, setBoardId] = useState<number | null>(null);

    // Mention autocomplete state
    const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
    const [mentionSuggestions, setMentionSuggestions] = useState<JiraUser[]>([]);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionStartIndex, setMentionStartIndex] = useState(-1);
    const [loadingMentions, setLoadingMentions] = useState(false);
    const [mentionedUsersMap, setMentionedUsersMap] = useState<Map<string, JiraUser>>(new Map());
    const commentInputRef = useRef<TextInput>(null);

    // Edit comment mention state
    const [showEditMentionSuggestions, setShowEditMentionSuggestions] = useState(false);
    const [editMentionSuggestions, setEditMentionSuggestions] = useState<JiraUser[]>([]);

    // User info popup state
    const [showUserInfoPopup, setShowUserInfoPopup] = useState(false);
    const [selectedUserInfo, setSelectedUserInfo] = useState<JiraUser | null>(null);
    const [editMentionQuery, setEditMentionQuery] = useState('');
    const [editMentionStartIndex, setEditMentionStartIndex] = useState(-1);
    const [loadingEditMentions, setLoadingEditMentions] = useState(false);
    const [editMentionedUsersMap, setEditMentionedUsersMap] = useState<Map<string, JiraUser>>(new Map());
    const editCommentInputRef = useRef<TextInput>(null);

    const toast = useToast();

    // Video player for preview modal - must be at top level
    const videoPlayer = useVideoPlayer(
        previewAttachment?.mimeType.startsWith('video/')
            ? { uri: previewAttachment.content, headers: authHeaders }
            : { uri: '' }
    );

    // Set up video player listeners
    useEffect(() => {
        if (!previewAttachment?.mimeType.startsWith('video/')) return;

        const subscription = videoPlayer.addListener('statusChange', (status) => {
            console.log('Video status:', status);
            if (status.status === 'readyToPlay') {
                console.log('Video ready for display');
                setVideoStatus('ready');
            } else if (status.status === 'error') {
                console.error('Video load error');
                setVideoStatus('error');
            } else if (status.status === 'loading') {
                console.log('Video loading started');
                setVideoStatus('loading');
            }
        });

        return () => {
            subscription.remove();
        };
    }, [previewAttachment?.id, videoPlayer]);

    useEffect(() => {
        loadIssueDetails();
        loadComments();
        loadLinks();
        loadCurrentUser();
        loadAuthHeaders();
    }, [issueKey]);

    useEffect(() => {
        console.log('Preview attachment state changed:', previewAttachment?.filename || 'null');
    }, [previewAttachment]);

    const loadAuthHeaders = async () => {
        try {
            const config = await StorageService.getConfig();
            if (config) {
                const authString = `${config.email}:${config.apiToken}`;
                const base64Auth = typeof Buffer !== 'undefined'
                    ? Buffer.from(authString).toString('base64')
                    : btoa(authString);

                const headers = {
                    'Authorization': `Basic ${base64Auth}`,
                };
                setAuthHeaders(headers);
                console.log('Auth headers loaded successfully');
            } else {
                console.warn('No config found, auth headers not set');
            }
        } catch (error) {
            console.error('Error loading auth headers:', error);
        }
    };

    const loadCurrentUser = async () => {
        try {
            const user = await jiraApi.getCurrentUser();
            setCurrentUser(user);
        } catch (error) {
            console.error('Error loading current user:', error);
        }
    };

    // Set content in RichEditor when modal opens
    useEffect(() => {
        if (editingDescription && descriptionInput && richEditorRef.current) {
            const timer = setTimeout(() => {
                console.log('Setting RichEditor content, length:', descriptionInput.length);
                console.log('First 200 chars:', descriptionInput.substring(0, 200));
                richEditorRef.current?.setContentHTML(descriptionInput);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [editingDescription]);

    // Preload image thumbnails when attachments are loaded
    useEffect(() => {
        if (issue?.fields.attachment) {
            issue.fields.attachment.forEach((attachment: any) => {
                if (attachment.mimeType.startsWith('image/') && !loadedImageData[attachment.id]) {
                    // Use full content URL for better quality instead of thumbnail
                    fetchImageWithAuth(attachment.content, attachment.id, attachment.mimeType);
                }
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [issue?.fields.attachment]);

    const loadIssueDetails = async () => {
        try {
            setLoading(true);
            const issueData = await jiraApi.getIssueDetails(issueKey);
            console.log('Issue data:', JSON.stringify(issueData, null, 2));
            console.log('Attachments:', issueData.fields.attachment);
            setIssue(issueData);
        } catch (error) {
            console.error('Error loading issue details:', error);
            toast.error('Failed to load issue details');
        } finally {
            setLoading(false);
        }
    };

    const loadComments = async () => {
        if (Platform.OS === 'web') {
            setLoadingComments(false);
            return;
        }

        try {
            setLoadingComments(true);
            const commentsData = await jiraApi.getIssueComments(issueKey);

            // Map comments and extract parent ID from the response
            const mappedComments = commentsData.map((comment: any) => {
                // Extract parent ID if it exists (only available in JSM projects)
                const parentId = comment.parent?.id || comment.parentId || null;

                return {
                    ...comment,
                    parentId,
                };
            });

            console.log('Mapped comments with parent IDs:', mappedComments.map(c => ({
                id: c.id,
                parentId: c.parentId,
                hasParent: !!c.parentId,
            })));

            setComments(mappedComments);
        } catch (error) {
            console.error('Error loading comments:', error);
        } finally {
            setLoadingComments(false);
        }
    };

    const loadLinks = async () => {
        if (Platform.OS === 'web') {
            return;
        }

        try {
            setLoadingLinks(true);
            const [links, remote] = await Promise.all([
                jiraApi.getIssueLinks(issueKey),
                jiraApi.getRemoteLinks(issueKey),
            ]);
            setIssueLinks(links);
            setRemoteLinks(remote);
        } catch (error) {
            console.error('Error loading links:', error);
        } finally {
            setLoadingLinks(false);
        }
    };

    const getStatusColor = (statusCategory: string): string => {
        const colors: { [key: string]: string } = {
            done: '#36B37E',
            indeterminate: '#0065FF',
            new: '#6554C0',
            todo: '#6554C0',
            default: '#5E6C84',
        };
        return colors[statusCategory.toLowerCase()] || colors.default;
    };

    const getPriorityEmoji = (priority?: string): string => {
        if (!priority) return '📋';
        const emojiMap: { [key: string]: string } = {
            highest: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢',
            lowest: '🔵',
        };
        return emojiMap[priority.toLowerCase()] || '📋';
    };

    const renderDescriptionText = (description: any) => {
        // Handle simple string
        if (typeof description === 'string') {
            return <Text style={styles.description}>{description}</Text>;
        }

        // Helper function to render inline content (text, mentions, links, etc.)
        const renderInlineContent = (content: any[], baseStyle?: any) => {
            return content.map((item: any, itemIndex: number) => {
                if (item.type === 'text') {
                    // Apply formatting marks (bold, italic, etc.)
                    let textStyle = baseStyle || {};
                    if (item.marks) {
                        item.marks.forEach((mark: any) => {
                            if (mark.type === 'strong') {
                                textStyle = { ...textStyle, fontWeight: 'bold' };
                            } else if (mark.type === 'em') {
                                textStyle = { ...textStyle, fontStyle: 'italic' };
                            } else if (mark.type === 'code') {
                                textStyle = { ...textStyle, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', backgroundColor: '#f4f4f4' };
                            } else if (mark.type === 'link') {
                                return (
                                    <Text
                                        key={itemIndex}
                                        style={[textStyle, styles.linkText]}
                                        onPress={() => Linking.openURL(mark.attrs?.href)}
                                    >
                                        {item.text || mark.attrs?.href}
                                    </Text>
                                );
                            }
                        });
                    }
                    return <Text key={itemIndex} style={textStyle}>{item.text || ''}</Text>;
                } else if (item.type === 'mention') {
                    return (
                        <Text key={itemIndex} style={styles.mentionText}>
                            {item.attrs?.text || '@user'}
                        </Text>
                    );
                } else if (item.type === 'inlineCard') {
                    const url = item.attrs?.url || '';
                    return (
                        <Text
                            key={itemIndex}
                            style={styles.linkText}
                            onPress={() => url && Linking.openURL(url)}
                        >
                            {url || '[Card]'}
                        </Text>
                    );
                } else if (item.type === 'hardBreak') {
                    return <Text key={itemIndex}>{'\n'}</Text>;
                }
                return null;
            });
        };

        // Recursive function to render list items
        const renderListItem = (listItemNode: any, itemIndex: number) => {
            return (
                <View key={itemIndex} style={styles.listItem}>
                    {listItemNode.content?.map((node: any, nodeIndex: number) => {
                        if (node.type === 'paragraph' && node.content) {
                            return (
                                <Text key={nodeIndex} style={styles.listItemText}>
                                    {renderInlineContent(node.content)}
                                </Text>
                            );
                        } else if (node.type === 'bulletList' || node.type === 'orderedList') {
                            // Nested list
                            return (
                                <View key={nodeIndex} style={styles.nestedList}>
                                    {renderList(node, nodeIndex)}
                                </View>
                            );
                        }
                        return null;
                    })}
                </View>
            );
        };

        // Function to render ordered or bullet lists
        const renderList = (listNode: any, listIndex: number) => {
            const isOrdered = listNode.type === 'orderedList';
            const startNumber = listNode.attrs?.order || 1;

            return listNode.content?.map((listItemNode: any, itemIndex: number) => {
                if (listItemNode.type === 'listItem') {
                    const bullet = isOrdered ? `${startNumber + itemIndex}. ` : '• ';
                    return (
                        <View key={itemIndex} style={styles.listItemContainer}>
                            <Text style={styles.listBullet}>{bullet}</Text>
                            <View style={styles.listItemContent}>
                                {listItemNode.content?.map((node: any, nodeIndex: number) => {
                                    if (node.type === 'paragraph' && node.content) {
                                        return (
                                            <Text key={nodeIndex} style={styles.listItemText}>
                                                {renderInlineContent(node.content)}
                                            </Text>
                                        );
                                    } else if (node.type === 'bulletList' || node.type === 'orderedList') {
                                        // Nested list
                                        return (
                                            <View key={nodeIndex} style={styles.nestedList}>
                                                {renderList(node, nodeIndex)}
                                            </View>
                                        );
                                    }
                                    return null;
                                })}
                            </View>
                        </View>
                    );
                }
                return null;
            });
        };

        // Handle ADF (Atlassian Document Format)
        if (description?.content && Array.isArray(description.content)) {
            return (
                <View>
                    {description.content.map((node: any, nodeIndex: number) => {
                        if (node.type === 'paragraph' && node.content) {
                            return (
                                <Text key={nodeIndex} style={styles.descriptionParagraph}>
                                    {renderInlineContent(node.content)}
                                </Text>
                            );
                        } else if (node.type === 'heading' && node.content) {
                            const level = node.attrs?.level || 1;
                            const headingStyle = level === 1 ? styles.heading1 :
                                level === 2 ? styles.heading2 :
                                    level === 3 ? styles.heading3 :
                                        level === 4 ? styles.heading4 :
                                            styles.heading5;
                            return (
                                <Text key={nodeIndex} style={headingStyle}>
                                    {renderInlineContent(node.content, headingStyle)}
                                </Text>
                            );
                        } else if (node.type === 'bulletList' || node.type === 'orderedList') {
                            return (
                                <View key={nodeIndex} style={styles.listContainer}>
                                    {renderList(node, nodeIndex)}
                                </View>
                            );
                        } else if (node.type === 'mediaSingle' && node.content) {
                            // Handle embedded media (images/attachments)
                            console.log('Found mediaSingle node:', node);
                            const mediaNode = node.content.find((n: any) => n.type === 'media');
                            console.log('Media node:', mediaNode);

                            if (mediaNode && mediaNode.attrs) {
                                const mediaType = mediaNode.attrs.type || 'file';
                                const altText = mediaNode.attrs.alt || '';

                                console.log('Media alt text (filename):', altText, 'Type:', mediaType);
                                console.log('Available attachments:', issue?.fields.attachment?.map((a: any) => ({ id: a.id, filename: a.filename })));

                                // Find the attachment by matching filename in alt text
                                const attachment = issue?.fields.attachment?.find((a: any) =>
                                    a.filename === altText || a.filename.includes(altText) || altText.includes(a.filename)
                                );

                                console.log('Found attachment:', attachment);

                                if (attachment && mediaType === 'file') {
                                    const isImage = attachment.mimeType.startsWith('image/');
                                    const isVideo = attachment.mimeType.startsWith('video/');

                                    if (isImage) {
                                        return (
                                            <TouchableOpacity
                                                key={nodeIndex}
                                                onPress={() => handleAttachmentPress(attachment)}
                                                style={styles.descriptionImageContainer}
                                            >
                                                {loadedImageData[attachment.id] ? (
                                                    <Image
                                                        source={{ uri: loadedImageData[attachment.id] }}
                                                        style={styles.descriptionImage}
                                                        resizeMode="contain"
                                                    />
                                                ) : (
                                                    <View style={styles.descriptionImagePlaceholder}>
                                                        <ActivityIndicator size="small" color="#0052CC" />
                                                        <Text style={styles.descriptionImagePlaceholderText}>
                                                            Loading image...
                                                        </Text>
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    } else if (isVideo) {
                                        return (
                                            <TouchableOpacity
                                                key={nodeIndex}
                                                onPress={() => handleAttachmentPress(attachment)}
                                                style={styles.descriptionVideoContainer}
                                            >
                                                <View style={styles.descriptionVideoPlaceholder}>
                                                    <Text style={styles.descriptionVideoIcon}>🎥</Text>
                                                    <Text style={styles.descriptionVideoText}>
                                                        {attachment.filename}
                                                    </Text>
                                                    <Text style={styles.descriptionVideoHint}>Tap to play</Text>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    }
                                }
                                return null;
                            }
                        } else if (node.type === 'mediaGroup' && node.content) {
                            // Handle media groups (multiple files)
                            return (
                                <View key={nodeIndex} style={styles.mediaGroupContainer}>
                                    {node.content.map((mediaItem: any, mediaIndex: number) => {
                                        if (mediaItem.type === 'media' && mediaItem.attrs) {
                                            const altText = mediaItem.attrs.alt || '';
                                            const attachment = issue?.fields.attachment?.find((a: any) =>
                                                a.filename === altText || a.filename.includes(altText) || altText.includes(a.filename)
                                            );

                                            if (attachment) {
                                                const isImage = attachment.mimeType.startsWith('image/');
                                                const isVideo = attachment.mimeType.startsWith('video/');

                                                if (isImage) {
                                                    return (
                                                        <TouchableOpacity
                                                            key={mediaIndex}
                                                            onPress={() => handleAttachmentPress(attachment)}
                                                            style={styles.descriptionImageContainer}
                                                        >
                                                            {loadedImageData[attachment.id] ? (
                                                                <Image
                                                                    source={{ uri: loadedImageData[attachment.id] }}
                                                                    style={styles.descriptionImage}
                                                                    resizeMode="contain"
                                                                />
                                                            ) : (
                                                                <View style={styles.descriptionImagePlaceholder}>
                                                                    <ActivityIndicator size="small" color="#0052CC" />
                                                                    <Text style={styles.descriptionImagePlaceholderText}>
                                                                        Loading image...
                                                                    </Text>
                                                                </View>
                                                            )}
                                                        </TouchableOpacity>
                                                    );
                                                } else if (isVideo) {
                                                    return (
                                                        <TouchableOpacity
                                                            key={mediaIndex}
                                                            onPress={() => handleAttachmentPress(attachment)}
                                                            style={styles.descriptionVideoContainer}
                                                        >
                                                            <View style={styles.descriptionVideoPlaceholder}>
                                                                <Text style={styles.descriptionVideoIcon}>🎥</Text>
                                                                <Text style={styles.descriptionVideoText}>
                                                                    {attachment.filename}
                                                                </Text>
                                                                <Text style={styles.descriptionVideoHint}>Tap to play</Text>
                                                            </View>
                                                        </TouchableOpacity>
                                                    );
                                                }
                                            }
                                        }
                                        return null;
                                    })}
                                </View>
                            );
                        } else if (node.type === 'codeBlock' && node.content) {
                            const codeText = node.content.map((text: any) => text.text || '').join('');
                            return (
                                <View key={nodeIndex} style={styles.codeBlockContainer}>
                                    <Text style={styles.codeBlockText}>{codeText}</Text>
                                </View>
                            );
                        }
                        return null;
                    })}
                </View>
            );
        }

        return <Text style={styles.description}>No description</Text>;
    };

    const renderCommentText = (comment: any) => {
        // Handle both simple string and ADF (Atlassian Document Format) content
        if (typeof comment.body === 'string') {
            // Parse plain text for URLs and make them clickable
            return (
                <Text style={styles.commentBody}>
                    {linkifyText(comment.body, { linkStyle: styles.linkText })}
                </Text>
            );
        }

        // Extract text from ADF format
        if (comment.body?.content) {
            return (
                <View style={styles.commentBody}>
                    {comment.body.content.map((node: any, nodeIndex: number) => {
                        if (node.type === 'paragraph' && node.content) {
                            // Render paragraph content with text and mentions inline
                            return (
                                <Text key={nodeIndex} style={styles.paragraphText}>
                                    {node.content.map((item: any, itemIndex: number) => {
                                        if (item.type === 'text') {
                                            // Check if text has link mark
                                            const linkMark = item.marks?.find((mark: any) => mark.type === 'link');
                                            if (linkMark && linkMark.attrs?.href) {
                                                return (
                                                    <Text
                                                        key={itemIndex}
                                                        style={styles.linkText}
                                                        onPress={() => Linking.openURL(linkMark.attrs.href)}
                                                    >
                                                        {item.text || linkMark.attrs.href}
                                                    </Text>
                                                );
                                            }

                                            // Return plain text (linkifyText returns React elements)
                                            return (
                                                <Text key={itemIndex}>
                                                    {linkifyText(item.text || '', { linkStyle: styles.linkText })}
                                                </Text>
                                            );
                                        } else if (item.type === 'mention') {
                                            // Render mention as inline styled text with click handler
                                            const mentionText = item.attrs?.text?.replace('@', '') || 'user';
                                            const accountId = item.attrs?.id || '';
                                            return (
                                                <Text
                                                    key={itemIndex}
                                                    style={styles.mentionInlineChip}
                                                    onPress={async () => {
                                                        // Fetch user info from Jira API by accountId
                                                        try {
                                                            const userInfo = await jiraApi.getUserByAccountId(accountId);

                                                            if (userInfo) {
                                                                setSelectedUserInfo(userInfo);
                                                            } else {
                                                                // Fallback to basic info if API fails
                                                                setSelectedUserInfo({
                                                                    accountId,
                                                                    displayName: mentionText,
                                                                    emailAddress: '',
                                                                    avatarUrls: { '48x48': '' }
                                                                });
                                                            }

                                                            setShowUserInfoPopup(true);
                                                        } catch (error) {
                                                            console.error('Error fetching user info:', error);
                                                            // Show popup with basic info even on error
                                                            setSelectedUserInfo({
                                                                accountId,
                                                                displayName: mentionText,
                                                                emailAddress: '',
                                                                avatarUrls: { '48x48': '' }
                                                            });
                                                            setShowUserInfoPopup(true);
                                                        }
                                                    }}
                                                >
                                                    {mentionText}
                                                </Text>
                                            );
                                        }
                                        return null;
                                    })}
                                </Text>
                            );
                        } else if (node.type === 'mediaSingle' && node.content) {
                            // Handle embedded media (images/attachments) in comments
                            const mediaNode = node.content.find((n: any) => n.type === 'media');
                            if (mediaNode && mediaNode.attrs) {
                                const mediaType = mediaNode.attrs.type || 'file';
                                const altText = mediaNode.attrs.alt || '';

                                // Find the attachment by matching filename in alt text
                                const attachment = issue?.fields.attachment?.find((a: any) =>
                                    a.filename === altText || a.filename.includes(altText) || altText.includes(a.filename)
                                );

                                if (attachment) {
                                    const isImage = attachment.mimeType.startsWith('image/');
                                    const isVideo = attachment.mimeType.startsWith('video/');
                                    const isPdf = attachment.mimeType === 'application/pdf';

                                    return (
                                        <TouchableOpacity
                                            key={nodeIndex}
                                            onPress={() => handleAttachmentPress(attachment)}
                                            style={styles.commentAttachmentContainer}
                                        >
                                            {isImage && loadedImageData[attachment.id] ? (
                                                <Image
                                                    source={{ uri: loadedImageData[attachment.id] }}
                                                    style={styles.commentAttachmentImage}
                                                    resizeMode="cover"
                                                />
                                            ) : (
                                                <View style={styles.commentAttachmentPlaceholder}>
                                                    <Text style={styles.commentAttachmentIcon}>
                                                        {getFileIcon(attachment.mimeType)}
                                                    </Text>
                                                    <View style={styles.commentAttachmentInfo}>
                                                        <Text style={styles.commentAttachmentName} numberOfLines={1}>
                                                            {attachment.filename}
                                                        </Text>
                                                        <Text style={styles.commentAttachmentSize}>
                                                            {isImage && 'Image • '}
                                                            {isVideo && 'Video • '}
                                                            {isPdf && 'PDF • '}
                                                            {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : 'Size unknown'}
                                                        </Text>
                                                    </View>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                }
                            }
                            return null;
                        } else if (node.type === 'mediaGroup' && node.content) {
                            // Handle media groups (multiple files)
                            return (
                                <View key={nodeIndex} style={styles.commentMediaGroup}>
                                    {node.content.map((mediaItem: any, mediaIndex: number) => {
                                        if (mediaItem.type === 'media' && mediaItem.attrs) {
                                            const altText = mediaItem.attrs.alt || '';
                                            const attachment = issue?.fields.attachment?.find((a: any) =>
                                                a.filename === altText || a.filename.includes(altText) || altText.includes(a.filename)
                                            );

                                            if (attachment) {
                                                const isImage = attachment.mimeType.startsWith('image/');
                                                return (
                                                    <TouchableOpacity
                                                        key={mediaIndex}
                                                        onPress={() => handleAttachmentPress(attachment)}
                                                        style={styles.commentAttachmentContainer}
                                                    >
                                                        {isImage && loadedImageData[attachment.id] ? (
                                                            <Image
                                                                source={{ uri: loadedImageData[attachment.id] }}
                                                                style={styles.commentAttachmentImage}
                                                                resizeMode="cover"
                                                            />
                                                        ) : (
                                                            <View style={styles.commentAttachmentPlaceholder}>
                                                                <Text style={styles.commentAttachmentIcon}>
                                                                    {getFileIcon(attachment.mimeType)}
                                                                </Text>
                                                                <View style={styles.commentAttachmentInfo}>
                                                                    <Text style={styles.commentAttachmentName} numberOfLines={1}>
                                                                        {attachment.filename}
                                                                    </Text>
                                                                    <Text style={styles.commentAttachmentSize}>
                                                                        {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : 'Size unknown'}
                                                                    </Text>
                                                                </View>
                                                            </View>
                                                        )}
                                                    </TouchableOpacity>
                                                );
                                            }
                                        }
                                        return null;
                                    })}
                                </View>
                            );
                        } else if (node.type === 'codeBlock' && node.content) {
                            const codeText = node.content.map((text: any) => text.text || '').join('');
                            return (
                                <View key={nodeIndex} style={styles.codeBlockContainer}>
                                    <Text style={styles.codeBlockText}>{codeText}</Text>
                                </View>
                            );
                        }
                        return null;
                    })}
                </View>
            );
        }

        return <Text style={styles.commentBody}>No content</Text>;
    };

    const getFileIcon = (mimeType: string): string => {
        if (mimeType.startsWith('image/')) return '🖼️';
        if (mimeType.startsWith('video/')) return '🎥';
        if (mimeType === 'application/pdf') return '📄';
        if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
        if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
        return '📎';
    };

    const fetchImageWithAuth = async (url: string, attachmentId: string, mimeType: string) => {
        try {
            const response = await jiraApi.fetchAttachment(url);
            const base64 = `data:${mimeType};base64,${response}`;
            setLoadedImageData(prev => ({ ...prev, [attachmentId]: base64 }));
            return base64;
        } catch (error) {
            console.error('Error fetching image:', error);
            return null;
        }
    };





    const handleAttachmentPress = (attachment: JiraAttachment) => {
        console.log('Attachment pressed:', attachment);
        console.log('Auth headers available:', Object.keys(authHeaders).length > 0);
        console.log('Attachment details:', {
            filename: attachment.filename,
            mimeType: attachment.mimeType,
            contentUrl: attachment.content,
        });

        // For images, fetch with authentication first (use full content URL for best quality)
        if (attachment.mimeType.startsWith('image/') && !loadedImageData[attachment.id]) {
            fetchImageWithAuth(attachment.content, attachment.id, attachment.mimeType);
        }

        // Reset video status when opening new attachment
        if (attachment.mimeType.startsWith('video/')) {
            setVideoStatus('loading');
        }

        // Show all attachments in modal preview
        setPreviewAttachment(attachment);
        console.log('Preview attachment set:', attachment.filename);
    };

    const renderAttachments = (attachments?: any[]) => {
        if (!attachments || attachments.length === 0) return null;

        console.log('Rendering attachments:', attachments);

        return (
            <View style={styles.attachmentsSection}>
                <Text style={styles.attachmentsTitle}>Attachments ({attachments.length})</Text>
                <View style={styles.attachmentsList}>
                    {attachments.map((attachment) => {
                        // Jira API returns: filename, mimeType, content (download URL), thumbnail, size
                        const filename = attachment.filename || 'Unknown file';
                        const mimeType = attachment.mimeType || '';
                        const contentUrl = attachment.content || '';
                        const thumbnailUrl = attachment.thumbnail || null;
                        const fileSize = attachment.size || 0;

                        const isImage = mimeType.startsWith('image/');

                        return (
                            <TouchableOpacity
                                key={attachment.id}
                                style={styles.attachmentItem}
                                onPress={() => handleAttachmentPress({
                                    id: attachment.id,
                                    filename,
                                    mimeType,
                                    content: contentUrl,
                                    thumbnail: thumbnailUrl,
                                    size: fileSize,
                                })}
                            >
                                {isImage && thumbnailUrl ? (
                                    loadedImageData[attachment.id] ? (
                                        <Image
                                            source={{ uri: loadedImageData[attachment.id] }}
                                            style={styles.attachmentThumbnail}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <View style={styles.attachmentIconContainer}>
                                            <ActivityIndicator size="small" color="#0052CC" />
                                        </View>
                                    )
                                ) : (
                                    <View style={styles.attachmentIconContainer}>
                                        <Text style={styles.editModalAttachmentIconLarge}>
                                            {getFileIcon(mimeType)}
                                        </Text>
                                    </View>
                                )}
                                <View style={styles.attachmentInfo}>
                                    <Text style={styles.attachmentFilename} numberOfLines={2}>
                                        {filename}
                                    </Text>
                                    <Text style={styles.attachmentSize}>
                                        {(fileSize / 1024).toFixed(1)} KB
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    };

    const handleAssigneePress = async () => {
        if (Platform.OS === 'web') {
            toast.warning('Changing assignee is not available on web due to CORS restrictions.');
            return;
        }

        try {
            setLoadingUsers(true);
            setShowAssigneePicker(true);
            setSearchQuery('');
            const users = await jiraApi.getAssignableUsers(issueKey);
            setAllUsers(users);
            setAssignableUsers(users);
        } catch (error) {
            console.error('Error loading assignable users:', error);
            toast.error('Failed to load assignable users');
            setShowAssigneePicker(false);
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleSearchUsers = async (query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setAssignableUsers(allUsers);
            return;
        }

        try {
            setLoadingUsers(true);
            const users = await jiraApi.getAssignableUsers(issueKey, query);
            setAssignableUsers(users);
        } catch (error) {
            console.error('Error searching users:', error);
            // Fallback to local filter if API fails
            const filtered = allUsers.filter(user =>
                user.displayName.toLowerCase().includes(query.toLowerCase()) ||
                user.emailAddress?.toLowerCase().includes(query.toLowerCase())
            );
            setAssignableUsers(filtered);
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleAssignUser = async (accountId: string | null) => {
        try {
            setAssigningUser(true);
            await jiraApi.assignIssue(issueKey, accountId);
            await loadIssueDetails(); // Reload to get updated assignee
            setShowAssigneePicker(false);
            toast.success(accountId ? 'Assignee updated successfully' : 'Issue unassigned successfully');
        } catch (error: any) {
            console.error('Error assigning issue:', error);
            toast.error(error?.response?.data?.errorMessages?.[0] || 'Failed to assign issue');
        } finally {
            setAssigningUser(false);
        }
    };

    const handleStatusPress = async () => {
        if (Platform.OS === 'web') {
            toast.warning('Changing status is not available on web due to CORS restrictions.');
            return;
        }

        try {
            setLoadingTransitions(true);
            setShowStatusPicker(true);
            const transitions = await jiraApi.getAvailableTransitions(issueKey);
            setAvailableTransitions(transitions);
        } catch (error) {
            console.error('Error loading transitions:', error);
            toast.error('Failed to load available transitions');
            setShowStatusPicker(false);
        } finally {
            setLoadingTransitions(false);
        }
    };

    const handleTransitionIssue = async (transitionId: string, transitionName: string) => {
        try {
            setTransitioningStatusId(transitionId);
            await jiraApi.transitionIssue(issueKey, transitionId);
            await loadIssueDetails(); // Reload to get updated status
            setShowStatusPicker(false);
            toast.success(`Status changed to ${transitionName}`);
        } catch (error: any) {
            console.error('Error transitioning issue:', error);
            toast.error(error?.response?.data?.errorMessages?.[0] || 'Failed to change status');
        } finally {
            setTransitioningStatusId(null);
        }
    };

    const handleTypePress = async () => {
        if (Platform.OS === 'web') {
            toast.warning('Changing type is not available on web due to CORS restrictions.');
            return;
        }

        try {
            setLoadingTypes(true);
            setShowTypePicker(true);
            const projectKey = issueKey.split('-')[0];
            const types = await jiraApi.getProjectIssueTypes(projectKey);
            setAvailableTypes(types);
        } catch (error) {
            console.error('Error loading issue types:', error);
            toast.error('Failed to load issue types');
            setShowTypePicker(false);
        } finally {
            setLoadingTypes(false);
        }
    };

    const handleUpdateType = async (typeId: string, typeName: string) => {
        try {
            setUpdatingType(true);
            await jiraApi.updateIssueField(issueKey, { issuetype: { id: typeId } });
            await loadIssueDetails();
            setShowTypePicker(false);
            toast.success(`Type changed to ${typeName}`);
        } catch (error: any) {
            console.error('Error updating type:', error);
            toast.error(error?.response?.data?.errorMessages?.[0] || 'Failed to change type');
        } finally {
            setUpdatingType(false);
        }
    };

    const handlePriorityPress = async () => {
        if (Platform.OS === 'web') {
            toast.warning('Changing priority is not available on web due to CORS restrictions.');
            return;
        }

        try {
            setLoadingPriorities(true);
            setShowPriorityPicker(true);
            const priorities = await jiraApi.getPriorities();
            setAvailablePriorities(priorities);
        } catch (error) {
            console.error('Error loading priorities:', error);
            toast.error('Failed to load priorities');
            setShowPriorityPicker(false);
        } finally {
            setLoadingPriorities(false);
        }
    };

    const handleUpdatePriority = async (priorityId: string, priorityName: string) => {
        try {
            setUpdatingPriorityId(priorityId);
            await jiraApi.updateIssueField(issueKey, { priority: { id: priorityId } });
            await loadIssueDetails();
            setShowPriorityPicker(false);
            toast.success(`Priority changed to ${priorityName}`);
        } catch (error: any) {
            console.error('Error updating priority:', error);
            toast.error(error?.response?.data?.errorMessages?.[0] || 'Failed to change priority');
        } finally {
            setUpdatingPriorityId(null);
        }
    };

    const handleDueDatePress = () => {
        if (Platform.OS === 'web') {
            toast.warning('Changing due date is not available on web due to CORS restrictions.');
            return;
        }
        const currentDate = issue?.fields.duedate ? new Date(issue.fields.duedate) : new Date();
        setSelectedDueDate(currentDate);
        setShowDueDatePicker(true);
    };

    const handleUpdateDueDate = async () => {
        try {
            setUpdatingDueDate(true);
            const dateString = selectedDueDate ? selectedDueDate.toISOString().split('T')[0] : null;
            await jiraApi.updateIssueField(issueKey, { duedate: dateString });
            await loadIssueDetails();
            setShowDueDatePicker(false);
            toast.success(dateString ? 'Due date updated' : 'Due date cleared');
        } catch (error: any) {
            console.error('Error updating due date:', error);
            toast.error(error?.response?.data?.errorMessages?.[0] || 'Failed to update due date');
        } finally {
            setUpdatingDueDate(false);
        }
    };

    const handleStoryPointsPress = () => {
        if (Platform.OS === 'web') {
            toast.warning('Changing story points is not available on web due to CORS restrictions.');
            return;
        }
        setStoryPointsInput(issue?.fields.customfield_10016?.toString() || '');
        setShowStoryPointsPicker(true);
    };

    const handleUpdateStoryPoints = async () => {
        try {
            setUpdatingStoryPoints(true);
            const points = storyPointsInput ? parseFloat(storyPointsInput) : null;
            await jiraApi.updateIssueField(issueKey, { customfield_10016: points });
            await loadIssueDetails();
            setShowStoryPointsPicker(false);
            toast.success('Story points updated');
        } catch (error: any) {
            console.error('Error updating story points:', error);
            toast.error(error?.response?.data?.errorMessages?.[0] || 'Failed to update story points');
        } finally {
            setUpdatingStoryPoints(false);
        }
    };

    const handleSprintPress = async () => {
        if (Platform.OS === 'web') {
            toast.warning('Changing sprint is not available on web due to CORS restrictions.');
            return;
        }

        try {
            setLoadingSprints(true);
            setShowSprintPicker(true);

            // Get boards - use cached data for faster loading
            const boardsResponse = await jiraApi.getBoards(0, 50);
            const boards = boardsResponse.boards || [];

            if (boards.length === 0) {
                toast.error('No boards available');
                setShowSprintPicker(false);
                setLoadingSprints(false);
                return;
            }

            // Prefer Scrum boards (they have sprints), use first board as fallback
            const scrumBoard = boards.find(b => b.type?.toLowerCase() !== 'kanban');
            const selectedBoard = scrumBoard || boards[0];

            setBoardId(selectedBoard.id);

            // Load all sprints for the board
            const allSprints = await jiraApi.getSprintsForBoard(selectedBoard.id);

            // Filter to show only active and future sprints (not closed ones)
            const relevantSprints = allSprints.filter(sprint =>
                sprint.state === 'active' || sprint.state === 'future'
            );

            setAvailableSprints(relevantSprints || []);

            if (relevantSprints.length === 0) {
                // If no active/future sprints, show all sprints
                setAvailableSprints(allSprints);
            }
        } catch (error: any) {
            console.error('Error loading sprints:', error);
            toast.error(error?.response?.data?.errorMessages?.[0] || 'Failed to load sprints');
            setShowSprintPicker(false);
        } finally {
            setLoadingSprints(false);
        }
    };

    const handleUpdateSprint = async (sprintId: number | null, sprintName: string) => {
        try {
            setUpdatingSprint(true);
            await jiraApi.moveIssueToSprint(issueKey, sprintId);
            await loadIssueDetails(); // Reload to get updated sprint
            setShowSprintPicker(false);
            toast.success(sprintId ? `Moved to ${sprintName}` : 'Moved to backlog');
        } catch (error: any) {
            console.error('Error updating sprint:', error);
            toast.error(error?.response?.data?.errorMessages?.[0] || 'Failed to update sprint');
        } finally {
            setUpdatingSprint(false);
        }
    };

    const handleSummaryEdit = () => {
        if (Platform.OS === 'web') {
            toast.warning('Editing summary is not available on web due to CORS restrictions.');
            return;
        }
        setSummaryInput(issue?.fields.summary || '');
        setEditingSummary(true);
    };

    const handleUpdateSummary = async () => {
        if (!summaryInput.trim()) {
            toast.warning('Summary cannot be empty');
            return;
        }

        try {
            setUpdatingSummary(true);
            await jiraApi.updateIssueField(issueKey, { summary: summaryInput.trim() });
            await loadIssueDetails();
            setEditingSummary(false);
            toast.success('Summary updated');
        } catch (error: any) {
            console.error('Error updating summary:', error);
            toast.error(error?.response?.data?.errorMessages?.[0] || 'Failed to update summary');
        } finally {
            setUpdatingSummary(false);
        }
    };

    const handleDescriptionEdit = () => {
        if (Platform.OS === 'web') {
            toast.warning('Editing description is not available on web due to CORS restrictions.');
            return;
        }
        // Extract text from description ADF and convert to HTML with structure
        const extractTextWithStructure = (node: any): string => {
            if (node.type === 'text') {
                let text = node.text || '';

                // Handle marks (like links, bold, italic, etc.)
                if (node.marks && node.marks.length > 0) {
                    node.marks.forEach((mark: any) => {
                        if (mark.type === 'link' && mark.attrs?.href) {
                            text = `<a href="${mark.attrs.href}">${text}</a>`;
                        } else if (mark.type === 'strong') {
                            text = `<strong>${text}</strong>`;
                        } else if (mark.type === 'em') {
                            text = `<em>${text}</em>`;
                        } else if (mark.type === 'code') {
                            text = `<code>${text}</code>`;
                        }
                    });
                }

                return text;
            }
            if (node.type === 'paragraph') {
                const content = node.content ? node.content.map((child: any) => extractTextWithStructure(child)).join('') : '';
                return `<p>${content || '&nbsp;'}</p>`;
            }
            if (node.type === 'heading') {
                const level = node.attrs?.level || 1;
                const content = node.content ? node.content.map((child: any) => extractTextWithStructure(child)).join('') : '';
                return `<h${level}>${content}</h${level}>`;
            }
            if (node.type === 'bulletList') {
                const items = node.content ? node.content.map((child: any) => extractTextWithStructure(child)).join('') : '';
                return `<ul>${items}</ul>`;
            }
            if (node.type === 'orderedList') {
                const items = node.content ? node.content.map((child: any) => extractTextWithStructure(child)).join('') : '';
                const start = node.attrs?.order || 1;
                return start === 1 ? `<ol>${items}</ol>` : `<ol start="${start}">${items}</ol>`;
            }
            if (node.type === 'listItem') {
                const content = node.content ? node.content.map((child: any) => extractTextWithStructure(child)).join('') : '';
                return `<li>${content}</li>`;
            }
            if (node.type === 'codeBlock') {
                const codeText = node.content ? node.content.map((child: any) => extractTextWithStructure(child)).join('') : '';
                return `<pre><code>${codeText}</code></pre>`;
            }
            if (node.type === 'hardBreak') {
                return '<br>';
            }
            if (node.type === 'mention') {
                return node.attrs?.text || '@user';
            }
            if (node.type === 'inlineCard') {
                const url = node.attrs?.url || '';
                return url ? `<a href="${url}">${url}</a>` : '[Card]';
            }
            if (node.content) {
                return node.content.map((child: any) => extractTextWithStructure(child)).join('');
            }
            return '';
        };

        const text = issue?.fields.description ? extractTextWithStructure(issue.fields.description) : '<p>No description</p>';

        // Split text into paragraphs
        const paragraphs = text.split('</p>').filter(p => p.trim());

        // Build HTML content with attachments interspersed
        let htmlContent = '';

        if (issue?.fields.attachment && issue.fields.attachment.length > 0) {
            // Calculate how to distribute attachments
            const attachmentsPerSection = Math.ceil(issue.fields.attachment.length / Math.max(paragraphs.length, 1));
            let attachmentIndex = 0;

            paragraphs.forEach((para, index) => {
                // Add paragraph
                htmlContent += para + '</p>';

                // Add attachments after each paragraph/section
                if (issue?.fields.attachment && issue.fields.attachment.length > 0) {
                    const attachmentsToShow = issue.fields.attachment.slice(
                        attachmentIndex,
                        attachmentIndex + attachmentsPerSection
                    );

                    if (attachmentsToShow.length > 0) {
                        attachmentsToShow.forEach((attachment: any) => {
                            if (attachment.mimeType.startsWith('image/') && loadedImageData[attachment.id]) {
                                htmlContent += `
                                <div style="margin: 15px 0; padding: 10px; border: 1px solid #DFE1E6; border-radius: 8px; background: #F4F5F7;">
                                    <img src="${loadedImageData[attachment.id]}" style="max-width: 100%; height: auto; border-radius: 6px; display: block;" />
                                    <small style="display: block; margin-top: 8px; color: #5E6C84;">📎 ${attachment.filename}</small>
                                </div>`;
                            } else {
                                htmlContent += `
                                <div style="margin: 15px 0; padding: 15px; background: #f4f5f7; border: 1px solid #DFE1E6; border-radius: 8px;">
                                    <div style="font-size: 32px; text-align: center;">📄</div>
                                    <small style="display: block; margin-top: 8px; text-align: center; color: #172B4D;">${attachment.filename}</small>
                                    <small style="display: block; text-align: center; color: #5E6C84;">${attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : 'Size unknown'}</small>
                                </div>`;
                            }
                        });
                        attachmentIndex += attachmentsPerSection;
                    }
                }
            });
        } else {
            htmlContent = text;
        }

        console.log('Generated HTML content length:', htmlContent.length);
        setDescriptionInput(htmlContent);
        setEditingDescription(true);
    };

    const handleUpdateDescription = async () => {
        try {
            setUpdatingDescription(true);

            // Strip HTML tags to get plain text for Jira ADF
            const stripHtml = (html: string) => {
                return html
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<hr\s*\/?>/gi, '\n---\n')
                    .replace(/<\/p>/gi, '\n')
                    .replace(/<[^>]*>/g, '')
                    .replace(/&nbsp;/g, ' ')
                    .trim();
            };

            const plainText = stripHtml(descriptionInput);

            const descriptionADF = plainText ? {
                type: 'doc',
                version: 1,
                content: [
                    {
                        type: 'paragraph',
                        content: [
                            {
                                type: 'text',
                                text: plainText,
                            },
                        ],
                    },
                ],
            } : null;
            await jiraApi.updateIssueField(issueKey, { description: descriptionADF });
            await loadIssueDetails();
            setEditingDescription(false);
            toast.success('Description updated');
        } catch (error: any) {
            console.error('Error updating description:', error);
            toast.error(error?.response?.data?.errorMessages?.[0] || 'Failed to update description');
        } finally {
            setUpdatingDescription(false);
        }
    };

    const handleCommentEdit = (comment: JiraComment) => {
        if (Platform.OS === 'web') {
            toast.warning('Editing comments is not available on web due to CORS restrictions.');
            return;
        }
        // Extract text from comment ADF and parse mentions
        const extractTextAndMentions = (node: any, mentionsMap: Map<string, JiraUser>) => {
            let text = '';
            if (node.type === 'text') {
                text = node.text || '';
            } else if (node.type === 'mention') {
                // Extract mention info
                const accountId = node.attrs?.id;
                const displayName = node.attrs?.text?.replace('@', '') || '';
                if (accountId && displayName) {
                    // Create a user object from the mention
                    mentionsMap.set(displayName, {
                        accountId,
                        displayName,
                        emailAddress: '',
                        avatarUrls: {
                            '48x48': ''
                        }
                    } as JiraUser);
                }
                text = `@${displayName}`;
            } else if (node.content) {
                text = node.content.map((child: any) => extractTextAndMentions(child, mentionsMap)).join('');
            }
            return text;
        };

        const mentionsMap = new Map<string, JiraUser>();
        const text = comment.body ? extractTextAndMentions(comment.body, mentionsMap) : '';
        setEditCommentText(text);
        setEditMentionedUsersMap(mentionsMap);
        setEditingCommentId(comment.id);
    };

    const handleUpdateComment = async () => {
        if (!editCommentText.trim()) {
            toast.warning('Comment cannot be empty');
            return;
        }

        try {
            setUpdatingComment(true);

            // Extract all mentioned users from the comment text
            const mentionedUsers: Array<{ accountId: string, displayName: string }> = [];
            const mentionRegex = /@([A-Z][A-Za-z0-9\s._-]*?)(?=\s+[a-z]|\s*$|[.,!?;:])/g;
            let match;
            while ((match = mentionRegex.exec(editCommentText)) !== null) {
                const displayName = match[1].trim();
                const user = editMentionedUsersMap.get(displayName);
                if (user) {
                    mentionedUsers.push({
                        accountId: user.accountId,
                        displayName: user.displayName,
                    });
                }
            }

            await jiraApi.updateComment(
                issueKey,
                editingCommentId!,
                editCommentText.trim(),
                mentionedUsers.length > 0 ? mentionedUsers : undefined
            );
            await loadComments();
            setEditingCommentId(null);
            setEditCommentText('');
            setEditMentionedUsersMap(new Map());
            toast.success('Comment updated');
        } catch (error: any) {
            console.error('Error updating comment:', error);
            toast.error(error?.response?.data?.errorMessages?.[0] || 'Failed to update comment');
        } finally {
            setUpdatingComment(false);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (Platform.OS === 'web') {
            toast.warning('Deleting comments is not available on web due to CORS restrictions.');
            return;
        }

        setCommentToDelete(commentId);
        setDeleteCommentModalVisible(true);
    };

    const confirmDeleteComment = async () => {
        if (!commentToDelete) return;

        try {
            setDeletingCommentId(commentToDelete);
            await jiraApi.deleteComment(issueKey, commentToDelete);
            await loadComments();
            toast.success('Comment deleted');
        } catch (error: any) {
            console.error('Error deleting comment:', error);
            toast.error(error?.response?.data?.errorMessages?.[0] || 'Failed to delete comment');
        } finally {
            setDeletingCommentId(null);
            setCommentToDelete(null);
            setDeleteCommentModalVisible(false);
        }
    };

    const handleAddComment = async () => {
        console.log('=== handleAddComment called ===');

        if (!commentText.trim()) {
            toast.warning('Please enter a comment');
            return;
        }

        console.log('Comment text passed validation:', commentText);

        if (Platform.OS === 'web') {
            toast.warning('Adding comments is not available on web due to CORS restrictions.');
            return;
        }

        console.log('Platform check passed, proceeding...');
        try {
            setPostingComment(true);

            // Extract all mentioned users from the comment text
            const mentionedUsers: Array<{ accountId: string, displayName: string }> = [];

            console.log('Comment text:', commentText);
            console.log('Mentioned users map:', Array.from(mentionedUsersMap.entries()));

            // Find @mentions in the text
            // Match names that start with uppercase and can contain spaces, until we hit lowercase word or punctuation
            const mentionRegex = /@([A-Z][A-Za-z0-9\s._-]*?)(?=\s+[a-z]|\s*$|[.,!?;:])/g;
            let match;
            while ((match = mentionRegex.exec(commentText)) !== null) {
                const displayName = match[1].trim();
                console.log('Found mention:', displayName);
                const user = mentionedUsersMap.get(displayName);
                if (user) {
                    console.log('User found in map:', user);
                    mentionedUsers.push({
                        accountId: user.accountId,
                        displayName: user.displayName,
                    });
                } else {
                    console.log('User NOT found in map for:', displayName);
                }
            }

            console.log('Final mentioned users:', mentionedUsers);

            // Debug alert to show mentions
            if (mentionedUsers.length > 0) {
                console.log('DEBUG: About to add comment with mentions:', mentionedUsers.map(u => u.displayName).join(', '));
            }

            // Add parent comment author if replying
            if (replyToCommentId) {
                const parentComment = comments.find(c => c.id === replyToCommentId);
                if (parentComment) {
                    const alreadyMentioned = mentionedUsers.some(u => u.accountId === parentComment.author.accountId);
                    if (!alreadyMentioned) {
                        mentionedUsers.push({
                            accountId: parentComment.author.accountId,
                            displayName: parentComment.author.displayName,
                        });
                    }
                }
            }

            await jiraApi.addComment(issueKey, commentText, replyToCommentId || undefined, mentionedUsers.length > 0 ? mentionedUsers : undefined);
            setCommentText('');
            setReplyToCommentId(null);
            setMentionedUsersMap(new Map()); // Clear the map after posting
            await loadComments();
            toast.success('Comment added successfully');
        } catch (error: any) {
            console.error('Error adding comment:', error);
            toast.error(error?.response?.data?.errorMessages?.[0] || 'Failed to add comment');
        } finally {
            setPostingComment(false);
        }
    };

    const handleReply = (commentId: string) => {
        setReplyToCommentId(commentId);
    };

    const cancelReply = () => {
        setReplyToCommentId(null);
        setCommentText('');
    };

    // Handle mention detection and autocomplete
    const handleCommentTextChange = async (text: string) => {
        setCommentText(text);

        // Detect @ mention - but exclude email addresses
        const cursorPosition = text.length; // For simplicity, assume cursor is at end

        // Find the last @ symbol before cursor
        let lastAtIndex = -1;
        for (let i = cursorPosition - 1; i >= 0; i--) {
            if (text[i] === '@') {
                lastAtIndex = i;
                break;
            }
            // Stop searching if we hit a space or newline (mention can't span these)
            if (text[i] === ' ' || text[i] === '\n') {
                break;
            }
        }

        if (lastAtIndex === -1) {
            setShowMentionSuggestions(false);
            return;
        }

        // Check if this is part of an email address
        // Look back before @ for characters that suggest an email
        const beforeAt = text.substring(Math.max(0, lastAtIndex - 20), lastAtIndex);
        const afterAt = text.substring(lastAtIndex + 1, Math.min(text.length, lastAtIndex + 50));

        // If there's a domain pattern after @ (like "employmenthero.com"), it's likely an email
        const emailDomainPattern = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        if (emailDomainPattern.test(afterAt)) {
            setShowMentionSuggestions(false);
            return;
        }

        // If there's no space before @ and it contains alphanumeric, it's likely an email
        if (lastAtIndex > 0 && text[lastAtIndex - 1] !== ' ' && text[lastAtIndex - 1] !== '\n' && /[a-zA-Z0-9]/.test(text[lastAtIndex - 1])) {
            setShowMentionSuggestions(false);
            return;
        }

        // Extract the query after @
        const query = text.substring(lastAtIndex + 1, cursorPosition).trim();
        setMentionQuery(query);
        setMentionStartIndex(lastAtIndex);

        // Fetch users matching the query
        if (issue?.key) {
            setLoadingMentions(true);
            try {
                const users = await jiraApi.getAssignableUsers(issue.key, query || undefined);
                setMentionSuggestions(users.slice(0, 5)); // Limit to 5 suggestions
                setShowMentionSuggestions(users.length > 0);
            } catch (error) {
                console.error('Error fetching mention suggestions:', error);
                setShowMentionSuggestions(false);
            } finally {
                setLoadingMentions(false);
            }
        }
    };

    const handleSelectMention = (user: JiraUser) => {
        if (mentionStartIndex === -1) return;

        // Replace the @query with @[displayName]
        const beforeMention = commentText.substring(0, mentionStartIndex);
        const afterMention = commentText.substring(commentText.length);
        const newText = `${beforeMention}@${user.displayName} ${afterMention}`;

        console.log('Selected user:', user);
        console.log('New text:', newText);

        // Store the mapping of displayName to accountId
        const updatedMap = new Map(mentionedUsersMap);
        updatedMap.set(user.displayName, user);
        setMentionedUsersMap(updatedMap);

        console.log('Updated map entries:', Array.from(updatedMap.entries()));

        setCommentText(newText);
        setShowMentionSuggestions(false);
        setMentionStartIndex(-1);

        // Focus back on input
        commentInputRef.current?.focus();
    };

    // Handle mention detection for edit comment
    const handleEditCommentTextChange = async (text: string) => {
        setEditCommentText(text);

        const cursorPosition = text.length;
        let lastAtIndex = -1;
        for (let i = cursorPosition - 1; i >= 0; i--) {
            if (text[i] === '@') {
                lastAtIndex = i;
                break;
            }
            if (text[i] === ' ' || text[i] === '\n') {
                break;
            }
        }

        if (lastAtIndex === -1) {
            setShowEditMentionSuggestions(false);
            return;
        }

        const beforeAt = text.substring(Math.max(0, lastAtIndex - 20), lastAtIndex);
        const afterAt = text.substring(lastAtIndex + 1, Math.min(text.length, lastAtIndex + 50));
        const emailDomainPattern = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        if (emailDomainPattern.test(afterAt)) {
            setShowEditMentionSuggestions(false);
            return;
        }

        if (lastAtIndex > 0 && text[lastAtIndex - 1] !== ' ' && text[lastAtIndex - 1] !== '\n' && /[a-zA-Z0-9]/.test(text[lastAtIndex - 1])) {
            setShowEditMentionSuggestions(false);
            return;
        }

        const query = text.substring(lastAtIndex + 1, cursorPosition).trim();
        setEditMentionQuery(query);
        setEditMentionStartIndex(lastAtIndex);

        if (issue?.key) {
            try {
                setLoadingEditMentions(true);
                const users = await jiraApi.getAssignableUsers(issue.key, query);
                setEditMentionSuggestions(users);
                setShowEditMentionSuggestions(true);
            } catch (error) {
                console.error('Error fetching edit mention users:', error);
                setShowEditMentionSuggestions(false);
            } finally {
                setLoadingEditMentions(false);
            }
        }
    };

    const handleSelectEditMention = (user: JiraUser) => {
        if (editMentionStartIndex === -1) return;

        const beforeMention = editCommentText.substring(0, editMentionStartIndex);
        const afterMention = editCommentText.substring(editCommentText.length);
        const newText = `${beforeMention}@${user.displayName} ${afterMention}`;

        const updatedMap = new Map(editMentionedUsersMap);
        updatedMap.set(user.displayName, user);
        setEditMentionedUsersMap(updatedMap);

        setEditCommentText(newText);
        setShowEditMentionSuggestions(false);
        setEditMentionStartIndex(-1);

        editCommentInputRef.current?.focus();
    };

    // Build comment tree structure
    const buildCommentTree = (comments: JiraComment[]): (JiraComment & { replies: JiraComment[] })[] => {
        console.log('Building comment tree from comments:', comments.map(c => ({ id: c.id, parentId: c.parentId })));

        const commentMap = new Map<string, JiraComment & { replies: JiraComment[] }>();
        const rootComments: (JiraComment & { replies: JiraComment[] })[] = [];

        // First pass: create map with empty replies array
        comments.forEach(comment => {
            commentMap.set(comment.id, { ...comment, replies: [] });
        });

        // Second pass: build tree structure
        comments.forEach(comment => {
            const commentWithReplies = commentMap.get(comment.id)!;
            if (comment.parentId) {
                console.log(`Comment ${comment.id} has parent ${comment.parentId}`);
                const parent = commentMap.get(String(comment.parentId));
                if (parent) {
                    parent.replies.push(commentWithReplies);
                } else {
                    // Parent not found, treat as root comment
                    console.log(`Parent ${comment.parentId} not found for comment ${comment.id}`);
                    rootComments.push(commentWithReplies);
                }
            } else {
                console.log(`Comment ${comment.id} is a root comment`);
                rootComments.push(commentWithReplies);
            }
        });

        console.log('Root comments:', rootComments.length);
        console.log('Comment tree structure:', rootComments.map(c => ({ id: c.id, repliesCount: c.replies.length })));

        return rootComments;
    };

    const commentTree = React.useMemo(() => buildCommentTree(comments), [comments]);

    // Render comment with its replies recursively
    const renderComment = (comment: JiraComment & { replies: JiraComment[] }, depth: number = 0) => {
        const maxDepth = 5;
        const indentAmount = Math.min(depth, maxDepth) * 20;

        return (
            <View key={comment.id}>
                <View style={[styles.commentItem, { marginLeft: indentAmount }]}>
                    <View style={styles.commentAuthorRow}>
                        {comment.author.avatarUrls?.['48x48'] ? (
                            <Image
                                source={{ uri: comment.author.avatarUrls['48x48'] }}
                                style={styles.commentAvatarImage}
                            />
                        ) : (
                            <View style={styles.commentAvatar}>
                                <Text style={styles.commentAvatarText}>
                                    {comment.author.displayName.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                        <View style={styles.commentMeta}>
                            <Text style={styles.commentAuthor}>
                                {comment.author.displayName}
                            </Text>
                            <Text style={styles.commentDate}>
                                {formatDate(comment.created)}
                            </Text>
                        </View>
                    </View>
                    {editingCommentId === comment.id ? (
                        <View style={styles.editCommentContainer}>
                            {/* Edit mention suggestions */}
                            {showEditMentionSuggestions && (
                                <View style={styles.mentionSuggestionsPopup}>
                                    {loadingEditMentions ? (
                                        <View style={styles.mentionLoadingContainer}>
                                            <ActivityIndicator size="small" color="#0052CC" />
                                            <Text style={styles.mentionLoadingText}>Loading...</Text>
                                        </View>
                                    ) : editMentionSuggestions.length > 0 ? (
                                        <ScrollView style={styles.mentionSuggestionsList}>
                                            {editMentionSuggestions.map((user) => (
                                                <TouchableOpacity
                                                    key={user.accountId}
                                                    style={styles.mentionSuggestionItem}
                                                    onPress={() => handleSelectEditMention(user)}
                                                >
                                                    {user.avatarUrls?.['48x48'] ? (
                                                        <Image
                                                            source={{ uri: user.avatarUrls['48x48'] }}
                                                            style={styles.mentionUserAvatar}
                                                        />
                                                    ) : (
                                                        <View style={[styles.mentionUserAvatar, styles.mentionAvatarPlaceholder]}>
                                                            <Text style={styles.mentionAvatarText}>
                                                                {user.displayName.charAt(0).toUpperCase()}
                                                            </Text>
                                                        </View>
                                                    )}
                                                    <View style={styles.mentionUserInfo}>
                                                        <Text style={styles.mentionUserName}>{user.displayName}</Text>
                                                        <Text style={styles.mentionUserEmail}>{user.emailAddress}</Text>
                                                    </View>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    ) : (
                                        <Text style={styles.mentionNoResults}>No users found</Text>
                                    )}
                                </View>
                            )}

                            {/* Debug badge for edit mentions */}
                            {editMentionedUsersMap.size > 0 && (
                                <View style={{ backgroundColor: '#E3FCEF', padding: 8, marginBottom: 8, borderRadius: 6 }}>
                                    <Text style={{ fontSize: 12, color: '#006644' }}>
                                        ✓ {editMentionedUsersMap.size} user{editMentionedUsersMap.size > 1 ? 's' : ''} mentioned:
                                        {Array.from(editMentionedUsersMap.keys()).join(', ')}
                                    </Text>
                                </View>
                            )}

                            <TextInput
                                ref={editCommentInputRef}
                                style={styles.editCommentInput}
                                value={editCommentText}
                                onChangeText={handleEditCommentTextChange}
                                placeholder="Edit your comment..."
                                multiline
                                numberOfLines={4}
                            />
                            <View style={styles.editCommentActions}>
                                <TouchableOpacity
                                    onPress={() => {
                                        setEditingCommentId(null);
                                        setEditCommentText('');
                                        setEditMentionedUsersMap(new Map());
                                    }}
                                    style={styles.editCancelButton}
                                >
                                    <Text style={styles.editCancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleUpdateComment}
                                    style={styles.editSaveButton}
                                    disabled={updatingComment}
                                >
                                    <Text style={styles.editSaveButtonText}>
                                        {updatingComment ? 'Saving...' : 'Save'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <>
                            {renderCommentText(comment)}
                            <View style={styles.commentActions}>
                                <TouchableOpacity
                                    onPress={() => handleReply(comment.id)}
                                    style={styles.commentActionButton}
                                >
                                    <Text style={styles.commentActionText}>↩️ Reply</Text>
                                </TouchableOpacity>
                                {currentUser && comment.author.accountId === currentUser.accountId && (
                                    <>
                                        <TouchableOpacity
                                            onPress={() => handleCommentEdit(comment)}
                                            style={styles.commentActionButton}
                                        >
                                            <Text style={styles.commentActionText}>✏️ Edit</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => handleDeleteComment(comment.id)}
                                            style={[styles.commentActionButton, styles.deleteActionButton]}
                                            disabled={deletingCommentId === comment.id}
                                        >
                                            <Text style={styles.deleteActionText}>
                                                {deletingCommentId === comment.id ? '⏳' : '🗑️'} Delete
                                            </Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                        </>
                    )}
                    {comment.replies.length > 0 && depth < maxDepth && (
                        <View style={styles.repliesIndicator}>
                            <Text style={styles.repliesCount}>{comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}</Text>
                        </View>
                    )}
                </View>
                {/* Render replies recursively */}
                {comment.replies.length > 0 && depth < maxDepth &&
                    comment.replies.map(reply => renderComment(reply as JiraComment & { replies: JiraComment[] }, depth + 1))
                }
            </View>
        );
    };

    if (loading || !issue) {
        return (
            <View style={styles.container}>
                <StatusBar style="light" />
                <LinearGradient
                    colors={['#0052CC', '#4C9AFF']}
                    style={styles.header}
                >
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Text style={styles.backIcon}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Issue Details</Text>
                    <View style={styles.backButton} />
                </LinearGradient>
                <ScrollView style={styles.content}>
                    <View style={{ paddingVertical: 16 }}>
                        <SkeletonLoader width={120} height={24} style={{ marginBottom: 8 }} />
                        <SkeletonLoader width="90%" height={28} style={{ marginBottom: 16 }} />
                    </View>
                    <View style={{ marginBottom: 24 }}>
                        <SkeletonLoader width={100} height={18} style={{ marginBottom: 12 }} />
                        <SkeletonText lines={4} lineHeight={16} spacing={8} lastLineWidth="80%" />
                    </View>
                    <View style={{ marginBottom: 24 }}>
                        <SkeletonLoader width={120} height={18} style={{ marginBottom: 12 }} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                            <SkeletonLoader width={80} height={16} />
                            <SkeletonLoader width={100} height={24} borderRadius={12} />
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                            <SkeletonLoader width={80} height={16} />
                            <SkeletonLoader width={80} height={24} borderRadius={12} />
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <SkeletonLoader width={80} height={16} />
                            <SkeletonLoader width={120} height={24} />
                        </View>
                    </View>
                </ScrollView>
            </View>
        );
    }

    const statusColor = getStatusColor(
        issue.fields.status.statusCategory.key || issue.fields.status.statusCategory.colorName
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <LinearGradient
                colors={['#0052CC', '#4C9AFF']}
                style={styles.header}
            >
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Issue Details</Text>
                <View style={styles.placeholder} />
            </LinearGradient>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
            >
                <ScrollView
                    style={styles.content}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Issue Key and Status */}
                    <View style={styles.card}>
                        <View style={styles.keyStatusRow}>
                            <View style={styles.keyContainer}>
                                <Text style={styles.issueKeyLabel}>Issue</Text>
                                <Text style={styles.issueKey}>{issue.key}</Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.statusBadge, { backgroundColor: statusColor }]}
                                onPress={handleStatusPress}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.statusText}>{issue.fields.status.name}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.divider} />
                        <Text style={styles.summary}>{issue.fields.summary}</Text>
                    </View>

                    {/* Description */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={styles.headerTitleRow}>
                                <Text style={styles.sectionIcon}>📝</Text>
                                <Text style={styles.sectionTitle}>Description</Text>
                            </View>
                            <TouchableOpacity onPress={handleDescriptionEdit} style={styles.editButton}>
                                <Text style={styles.editButtonText}>Edit</Text>
                            </TouchableOpacity>
                        </View>
                        {issue.fields.description ? (
                            <View style={styles.descriptionContent}>
                                {renderDescriptionText(issue.fields.description)}

                                {/* Inline Attachments */}
                                {issue.fields.attachment && issue.fields.attachment.length > 0 && (
                                    <View style={styles.inlineAttachmentsSection}>
                                        <View style={styles.attachmentsTitleRow}>
                                            <Text style={styles.attachmentIcon}>📎</Text>
                                            <Text style={styles.inlineAttachmentsTitle}>
                                                Attachments
                                            </Text>
                                            <View style={styles.attachmentCountBadge}>
                                                <Text style={styles.attachmentCountText}>{issue.fields.attachment.length}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.inlineAttachmentsGrid}>
                                            {issue.fields.attachment.map((attachment: any) => (
                                                <TouchableOpacity
                                                    key={attachment.id}
                                                    style={styles.inlineAttachmentItem}
                                                    onPress={() => handleAttachmentPress(attachment)}
                                                >
                                                    {attachment.mimeType.startsWith('image/') ? (
                                                        loadedImageData[attachment.id] ? (
                                                            <Image
                                                                source={{ uri: loadedImageData[attachment.id] }}
                                                                style={styles.inlineAttachmentImage}
                                                            />
                                                        ) : (
                                                            <View style={styles.inlineAttachmentPlaceholder}>
                                                                <ActivityIndicator size="small" color="#0052CC" />
                                                            </View>
                                                        )
                                                    ) : (
                                                        <View style={styles.inlineAttachmentFile}>
                                                            <Text style={styles.inlineAttachmentIcon}>📄</Text>
                                                        </View>
                                                    )}
                                                    <Text style={styles.inlineAttachmentName} numberOfLines={2}>
                                                        {attachment.filename}
                                                    </Text>
                                                    <Text style={styles.inlineAttachmentSize}>
                                                        {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : 'Size unknown'}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                )}
                            </View>
                        ) : (
                            <Text style={styles.emptyDescription}>No description</Text>
                        )}
                    </View>

                    {/* Details */}
                    <View style={styles.card}>
                        <View style={styles.headerTitleRow}>
                            <Text style={styles.sectionIcon}>📋</Text>
                            <Text style={styles.sectionTitle}>Details</Text>
                        </View>

                        <View style={styles.detailRow}>
                            <View style={styles.detailIconLabel}>
                                <Text style={styles.detailIcon}>🏷️</Text>
                                <Text style={styles.detailLabel}>Type</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.detailValueContainer}
                                onPress={handleTypePress}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.detailValue}>{issue.fields.issuetype.name}</Text>
                                <Text style={styles.chevron}>›</Text>
                            </TouchableOpacity>
                        </View>

                        {issue.fields.priority && (
                            <View style={styles.detailRow}>
                                <View style={styles.detailIconLabel}>
                                    <Text style={styles.detailIcon}>⚡</Text>
                                    <Text style={styles.detailLabel}>Priority</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.detailValueContainer}
                                    onPress={handlePriorityPress}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.priorityRow}>
                                        <Text style={styles.priorityEmoji}>
                                            {getPriorityEmoji(issue.fields.priority.name)}
                                        </Text>
                                        <Text style={styles.detailValue}>{issue.fields.priority.name}</Text>
                                    </View>
                                    <Text style={styles.chevron}>›</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={styles.detailRow}>
                            <View style={styles.detailIconLabel}>
                                <Text style={styles.detailIcon}>👤</Text>
                                <Text style={styles.detailLabel}>Assignee</Text>
                            </View>
                            {issue.fields.assignee ? (
                                <TouchableOpacity
                                    style={styles.detailValueContainer}
                                    onPress={handleAssigneePress}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.assigneeRow}>
                                        {issue.fields.assignee.avatarUrls?.['48x48'] ? (
                                            <Image
                                                source={{ uri: issue.fields.assignee.avatarUrls['48x48'] }}
                                                style={styles.assigneeAvatar}
                                            />
                                        ) : (
                                            <View style={styles.avatar}>
                                                <Text style={styles.avatarText}>
                                                    {issue.fields.assignee.displayName.charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                        )}
                                        <Text style={styles.detailValue}>
                                            {issue.fields.assignee.displayName}
                                        </Text>
                                    </View>
                                    <Text style={styles.chevron}>›</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={styles.detailValueContainer}
                                    onPress={handleAssigneePress}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.detailValue, styles.unassignedText]}>Unassigned</Text>
                                    <Text style={styles.chevron}>›</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {issue.fields.reporter && (
                            <View style={styles.detailRow}>
                                <View style={styles.detailIconLabel}>
                                    <Text style={styles.detailIcon}>✍️</Text>
                                    <Text style={styles.detailLabel}>Reporter</Text>
                                </View>
                                <View style={styles.detailValueContainer}>
                                    <View style={styles.assigneeRow}>
                                        {issue.fields.reporter.avatarUrls?.['48x48'] ? (
                                            <Image
                                                source={{ uri: issue.fields.reporter.avatarUrls['48x48'] }}
                                                style={styles.assigneeAvatar}
                                            />
                                        ) : (
                                            <View style={styles.avatar}>
                                                <Text style={styles.avatarText}>
                                                    {issue.fields.reporter.displayName.charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                        )}
                                        <Text style={styles.detailValue}>
                                            {issue.fields.reporter.displayName}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        <View style={styles.sectionDivider} />

                        <View style={styles.detailRow}>
                            <View style={styles.detailIconLabel}>
                                <Text style={styles.detailIcon}>📅</Text>
                                <Text style={styles.detailLabel}>Created</Text>
                            </View>
                            <Text style={styles.detailValueStatic}>{formatDate(issue.fields.created)}</Text>
                        </View>

                        <View style={styles.detailRow}>
                            <View style={styles.detailIconLabel}>
                                <Text style={styles.detailIcon}>🔄</Text>
                                <Text style={styles.detailLabel}>Updated</Text>
                            </View>
                            <Text style={styles.detailValueStatic}>{formatDate(issue.fields.updated)}</Text>
                        </View>

                        {issue.fields.duedate !== undefined && (
                            <View style={styles.detailRow}>
                                <View style={styles.detailIconLabel}>
                                    <Text style={styles.detailIcon}>⏰</Text>
                                    <Text style={styles.detailLabel}>Due Date</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.detailValueContainer}
                                    onPress={handleDueDatePress}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.detailValue, !issue.fields.duedate && styles.unassignedText]}>
                                        {issue.fields.duedate ? formatDateOnly(issue.fields.duedate) : 'Not set'}
                                    </Text>
                                    <Text style={styles.chevron}>›</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {issue.fields.customfield_10016 !== undefined && (
                            <View style={styles.detailRow}>
                                <View style={styles.detailIconLabel}>
                                    <Text style={styles.detailIcon}>🎯</Text>
                                    <Text style={styles.detailLabel}>Story Points</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.detailValueContainer}
                                    onPress={handleStoryPointsPress}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.detailValue, !issue.fields.customfield_10016 && styles.unassignedText]}>
                                        {issue.fields.customfield_10016 || 'Not set'}
                                    </Text>
                                    <Text style={styles.chevron}>›</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Sprint field */}
                        <View style={styles.detailRow}>
                            <View style={styles.detailIconLabel}>
                                <Text style={styles.detailIcon}>🏃</Text>
                                <Text style={styles.detailLabel}>Sprint</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.detailValueContainer}
                                onPress={handleSprintPress}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.detailValue, !issue.fields.customfield_10020 && styles.unassignedText]}>
                                    {(() => {
                                        const sprint = issue.fields.customfield_10020;
                                        if (!sprint || sprint === null) return '';
                                        if (Array.isArray(sprint)) {
                                            if (sprint.length === 0) return '';
                                            // Get the last sprint (most recent)
                                            const latestSprint = sprint[sprint.length - 1];
                                            if (latestSprint && latestSprint.name) {
                                                return latestSprint.name;
                                            }
                                            return '';
                                        }
                                        if (typeof sprint === 'object' && sprint.name) {
                                            return sprint.name;
                                        }
                                        return '';
                                    })()}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Linked Issues and Pages */}
                    {(issueLinks.length > 0 || remoteLinks.length > 0) && (
                        <View style={styles.card}>
                            <View style={styles.linksSectionHeader}>
                                <View style={styles.headerTitleRow}>
                                    <Text style={styles.sectionIcon}>🔗</Text>
                                    <Text style={styles.sectionTitle}>Links</Text>
                                </View>
                                <View style={styles.linksCountBadge}>
                                    <Text style={styles.linksCountText}>{issueLinks.length + remoteLinks.length}</Text>
                                </View>
                            </View>

                            {/* Issue Links */}
                            {issueLinks.map((link: any, index: number) => {
                                const linkedIssue = link.outwardIssue || link.inwardIssue;
                                const linkType = link.outwardIssue ? link.type.outward : link.type.inward;

                                if (!linkedIssue) return null;

                                return (
                                    <TouchableOpacity
                                        key={`issue-${index}`}
                                        style={styles.linkItem}
                                        onPress={() => toast.info(`${linkedIssue.key}: ${linkedIssue.fields.summary}`)}
                                    >
                                        <View style={styles.linkIcon}>
                                            <Text style={styles.linkIconText}>🔗</Text>
                                        </View>
                                        <View style={styles.linkContent}>
                                            <Text style={styles.linkType}>{linkType}</Text>
                                            <Text style={styles.linkTitle}>
                                                {linkedIssue.key} - {linkedIssue.fields.summary}
                                            </Text>
                                            <Text style={styles.linkStatus}>
                                                {linkedIssue.fields.status.name}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}

                            {/* Remote Links (Confluence pages, etc.) */}
                            {remoteLinks.map((link: any, index: number) => (
                                <TouchableOpacity
                                    key={`remote-${index}`}
                                    style={styles.linkItem}
                                    onPress={() => {
                                        const url = link.object?.url;
                                        if (url) {
                                            Linking.openURL(url);
                                        }
                                    }}
                                >
                                    <View style={styles.linkIcon}>
                                        <Text style={styles.linkIconText}>
                                            {link.object?.title?.toLowerCase().includes('confluence') ? '📄' : '🌐'}
                                        </Text>
                                    </View>
                                    <View style={styles.linkContent}>
                                        <Text style={styles.linkType}>
                                            {link.relationship || 'Related'}
                                        </Text>
                                        <Text style={styles.linkTitle}>
                                            {link.object?.title || 'External Link'}
                                        </Text>
                                        {link.object?.summary && (
                                            <Text style={styles.linkSummary} numberOfLines={2}>
                                                {link.object.summary}
                                            </Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Comments */}
                    <View style={styles.card}>
                        <View style={styles.headerTitleRow}>
                            <Text style={styles.sectionIcon}>💬</Text>
                            <Text style={styles.sectionTitle}>Comments</Text>
                            <Text style={styles.commentCount}>({comments.length})</Text>
                        </View>

                        {Platform.OS === 'web' ? (
                            <Text style={styles.webWarning}>
                                💡 Comments are not available on web due to CORS restrictions. Please use the mobile app.
                            </Text>
                        ) : loadingComments ? (
                            <ActivityIndicator color="#0052CC" style={styles.commentsLoader} />
                        ) : comments.length > 0 ? (
                            <View>
                                {commentTree.map(comment => renderComment(comment, 0))}
                            </View>
                        ) : (
                            <Text style={styles.noComments}>No comments yet</Text>
                        )}
                    </View>

                    <View style={styles.bottomPadding} />
                </ScrollView>

                {/* Fixed Comment Input at Bottom */}
                {Platform.OS !== 'web' && (
                    <View style={styles.fixedCommentSection}>
                        {/* Mention Suggestions Popup */}
                        {showMentionSuggestions && (
                            <View style={styles.mentionSuggestionsContainer}>
                                {loadingMentions ? (
                                    <View style={styles.mentionLoadingContainer}>
                                        <ActivityIndicator size="small" color="#0052CC" />
                                        <Text style={styles.mentionLoadingText}>Loading users...</Text>
                                    </View>
                                ) : (
                                    <ScrollView style={styles.mentionSuggestionsList} keyboardShouldPersistTaps="handled">
                                        {mentionSuggestions.map((user) => (
                                            <TouchableOpacity
                                                key={user.accountId}
                                                style={styles.mentionSuggestionItem}
                                                onPress={() => handleSelectMention(user)}
                                            >
                                                {user.avatarUrls?.['48x48'] ? (
                                                    <Image
                                                        source={{ uri: user.avatarUrls['48x48'] }}
                                                        style={styles.mentionAvatar}
                                                    />
                                                ) : (
                                                    <View style={styles.mentionAvatarPlaceholder}>
                                                        <Text style={styles.mentionAvatarText}>
                                                            {user.displayName.charAt(0).toUpperCase()}
                                                        </Text>
                                                    </View>
                                                )}
                                                <View style={styles.mentionUserInfo}>
                                                    <Text style={styles.mentionDisplayName}>{user.displayName}</Text>
                                                    {user.emailAddress && (
                                                        <Text style={styles.mentionEmail}>{user.emailAddress}</Text>
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                )}
                            </View>
                        )}

                        {replyToCommentId && (
                            <View style={styles.replyIndicator}>
                                <Text style={styles.replyingToText}>
                                    Replying to {comments.find(c => c.id === replyToCommentId)?.author.displayName}
                                </Text>
                                <TouchableOpacity onPress={cancelReply}>
                                    <Text style={styles.cancelReplyText}>✕</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Debug: Show mentioned users count */}
                        {mentionedUsersMap.size > 0 && (
                            <View style={{ backgroundColor: '#E3FCEF', padding: 8, marginHorizontal: 16, marginBottom: 8, borderRadius: 6 }}>
                                <Text style={{ fontSize: 12, color: '#006644' }}>
                                    ✓ {mentionedUsersMap.size} user{mentionedUsersMap.size > 1 ? 's' : ''} mentioned: {Array.from(mentionedUsersMap.keys()).join(', ')}
                                </Text>
                            </View>
                        )}

                        <View style={styles.commentInputRow}>
                            <TextInput
                                ref={commentInputRef}
                                style={styles.commentInput}
                                placeholder="Add a comment..."
                                placeholderTextColor="#999"
                                value={commentText}
                                onChangeText={handleCommentTextChange}
                                multiline
                                maxLength={500}
                            />
                            <TouchableOpacity
                                style={[styles.postButton, (postingComment || !commentText.trim()) && styles.postButtonDisabled]}
                                onPress={handleAddComment}
                                disabled={postingComment || !commentText.trim()}
                            >
                                {postingComment ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.postButtonText}>Post</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </KeyboardAvoidingView>

            {/* Attachment Preview Modal */}
            <Modal
                visible={previewAttachment !== null}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setPreviewAttachment(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle} numberOfLines={1}>
                                {previewAttachment?.filename}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setPreviewAttachment(null)}
                                style={styles.modalCloseButton}
                            >
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Render content based on mime type */}
                        {previewAttachment?.mimeType.startsWith('image/') ? (
                            <ScrollView
                                style={styles.modalImageContainer}
                                contentContainerStyle={styles.modalImageContent}
                            >
                                {loadedImageData[previewAttachment.id] ? (
                                    <Image
                                        source={{ uri: loadedImageData[previewAttachment.id] }}
                                        style={styles.modalImage}
                                        resizeMode="contain"
                                    />
                                ) : (
                                    <View style={styles.imageLoadingContainer}>
                                        <ActivityIndicator size="large" color="#0052CC" />
                                        <Text style={styles.imageLoadingText}>Loading image...</Text>
                                    </View>
                                )}
                            </ScrollView>

                        ) : previewAttachment?.mimeType === 'application/pdf' ? (
                            <View style={styles.modalPdfContainer}>
                                <WebView
                                    source={{
                                        uri: previewAttachment.content,
                                        headers: authHeaders,
                                    }}
                                    style={styles.modalWebView}
                                    originWhitelist={['*']}
                                    startInLoadingState={true}
                                    renderLoading={() => (
                                        <View style={styles.imageLoadingContainer}>
                                            <ActivityIndicator size="large" color="#0052CC" />
                                            <Text style={styles.imageLoadingText}>Loading PDF...</Text>
                                        </View>
                                    )}
                                    onError={(syntheticEvent) => {
                                        const { nativeEvent } = syntheticEvent;
                                        console.error('WebView PDF error:', nativeEvent);
                                    }}
                                    onHttpError={(syntheticEvent) => {
                                        const { nativeEvent } = syntheticEvent;
                                        console.error('WebView HTTP error:', nativeEvent.statusCode, nativeEvent.description);
                                    }}
                                    onLoadEnd={() => {
                                        console.log('PDF WebView load ended');
                                    }}
                                />
                            </View>
                        ) : previewAttachment?.mimeType.startsWith('video/') ? (
                            <View style={styles.modalVideoContainer}>
                                {(videoStatus === 'loading' || !authHeaders.Authorization) && (
                                    <View style={styles.videoLoadingOverlay}>
                                        <ActivityIndicator size="large" color="#fff" />
                                        <Text style={styles.videoLoadingText}>Loading video...</Text>
                                    </View>
                                )}
                                {videoStatus === 'error' && (
                                    <View style={styles.videoErrorOverlay}>
                                        <Text style={styles.videoErrorIcon}>⚠️</Text>
                                        <Text style={styles.videoErrorText}>Failed to load video</Text>
                                        <Text style={styles.videoErrorHint}>Tap "Open File" below to view in browser</Text>
                                    </View>
                                )}
                                <VideoView
                                    style={styles.modalVideo}
                                    player={videoPlayer}
                                    nativeControls
                                    contentFit="contain"
                                />
                            </View>
                        ) : (
                            <View style={styles.modalUnsupportedContainer}>
                                <Text style={styles.modalUnsupportedIcon}>{getFileIcon(previewAttachment?.mimeType || '')}</Text>
                                <Text style={styles.modalUnsupportedText}>
                                    {previewAttachment?.filename}
                                </Text>
                                <Text style={styles.modalUnsupportedHint}>
                                    Click below to open in browser
                                </Text>
                            </View>
                        )}

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalActionButton}
                                onPress={() => {
                                    if (previewAttachment) {
                                        Linking.openURL(previewAttachment.content);
                                    }
                                }}
                            >
                                <Text style={styles.modalActionText}>
                                    {previewAttachment?.mimeType.startsWith('image/') ? 'Open in Browser' : 'Open File'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Due Date Picker Modal */}
            <Modal
                visible={showDueDatePicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowDueDatePicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.statusModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Set Due Date</Text>
                            <TouchableOpacity
                                onPress={() => setShowDueDatePicker(false)}
                                style={styles.modalCloseButton}
                            >
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.currentStatusContainer}>
                            <Text style={styles.currentStatusLabel}>Current Due Date:</Text>
                            <Text style={styles.currentFieldValue}>
                                {issue.fields.duedate ? formatDateOnly(issue.fields.duedate) : 'Not set'}
                            </Text>
                        </View>

                        {Platform.OS === 'ios' ? (
                            <View style={styles.datePickerContainer}>
                                <DateTimePicker
                                    value={selectedDueDate || new Date()}
                                    mode="date"
                                    display="spinner"
                                    onChange={(event, date) => {
                                        if (date) {
                                            setSelectedDueDate(date);
                                        }
                                    }}
                                    style={styles.datePicker}
                                    textColor="#172B4D"
                                />
                                <View style={styles.dateActions}>
                                    <TouchableOpacity
                                        style={styles.dateButton}
                                        onPress={() => setSelectedDueDate(new Date())}
                                    >
                                        <Text style={styles.dateButtonText}>Today</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.dateButton}
                                        onPress={() => setSelectedDueDate(null)}
                                    >
                                        <Text style={styles.dateButtonText}>Clear</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.datePickerContainer}>
                                <TouchableOpacity
                                    style={styles.androidDateButton}
                                    onPress={() => setShowAndroidDatePicker(true)}
                                >
                                    <Text style={styles.androidDateButtonText}>
                                        📅 {selectedDueDate ? selectedDueDate.toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        }) : 'Select Date'}
                                    </Text>
                                </TouchableOpacity>
                                <View style={styles.dateActions}>
                                    <TouchableOpacity
                                        style={styles.dateButton}
                                        onPress={() => setSelectedDueDate(new Date())}
                                    >
                                        <Text style={styles.dateButtonText}>Today</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.dateButton}
                                        onPress={() => setSelectedDueDate(null)}
                                    >
                                        <Text style={styles.dateButtonText}>Clear</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.updateButton}
                            onPress={handleUpdateDueDate}
                            disabled={updatingDueDate}
                        >
                            {updatingDueDate ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.updateButtonText}>Update</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Summary Edit Modal */}
            <Modal
                visible={editingSummary}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setEditingSummary(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.statusModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Summary</Text>
                            <TouchableOpacity
                                onPress={() => setEditingSummary(false)}
                                style={styles.modalCloseButton}
                            >
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.summaryInput}
                            placeholder="Enter issue summary..."
                            value={summaryInput}
                            onChangeText={setSummaryInput}
                            multiline
                            numberOfLines={3}
                        />

                        <TouchableOpacity
                            style={styles.updateButton}
                            onPress={handleUpdateSummary}
                            disabled={updatingSummary}
                        >
                            {updatingSummary ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.updateButtonText}>Update</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Description Edit Modal */}
            <Modal
                visible={editingDescription}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setEditingDescription(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.descriptionModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Description</Text>
                            <TouchableOpacity
                                onPress={() => setEditingDescription(false)}
                                style={styles.modalCloseButton}
                            >
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.richEditorWrapper}>
                            <RichToolbar
                                editor={richEditorRef}
                                actions={[
                                    actions.setBold,
                                    actions.setItalic,
                                    actions.setUnderline,
                                    actions.insertBulletsList,
                                    actions.insertOrderedList,
                                    actions.insertLink,
                                    actions.setStrikethrough,
                                    actions.heading1,
                                    actions.code,
                                ]}
                                iconTint="#172B4D"
                                selectedIconTint="#0052CC"
                                style={styles.richToolbar}
                            />

                            <ScrollView style={styles.richEditorScroll}>
                                <RichEditor
                                    ref={richEditorRef}
                                    onChange={(html) => setDescriptionInput(html)}
                                    placeholder="Enter issue description..."
                                    style={styles.richEditor}
                                    initialHeight={250}
                                    useContainer={true}
                                    editorStyle={{
                                        backgroundColor: '#FFFFFF',
                                        color: '#172B4D',
                                        placeholderColor: '#5E6C84',
                                        contentCSSText: 'font-size: 15px; padding: 12px;'
                                    }}
                                />
                            </ScrollView>
                        </View>

                        <TouchableOpacity
                            style={styles.updateButton}
                            onPress={handleUpdateDescription}
                            disabled={updatingDescription}
                        >
                            {updatingDescription ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.updateButtonText}>Update</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Story Points Picker Modal */}
            <Modal
                visible={showStoryPointsPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowStoryPointsPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.statusModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Set Story Points</Text>
                            <TouchableOpacity
                                onPress={() => setShowStoryPointsPicker(false)}
                                style={styles.modalCloseButton}
                            >
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.currentStatusContainer}>
                            <Text style={styles.currentStatusLabel}>Current Story Points:</Text>
                            <Text style={styles.currentFieldValue}>
                                {issue.fields.customfield_10016 || 'Not set'}
                            </Text>
                        </View>

                        <TextInput
                            style={styles.storyPointsInput}
                            placeholder="Enter story points (e.g., 3, 5, 8)"
                            value={storyPointsInput}
                            onChangeText={setStoryPointsInput}
                            keyboardType="decimal-pad"
                        />

                        <View style={styles.quickPointsContainer}>
                            {[1, 2, 3, 5, 8, 13].map((point) => (
                                <TouchableOpacity
                                    key={point}
                                    style={styles.quickPointButton}
                                    onPress={() => setStoryPointsInput(point.toString())}
                                >
                                    <Text style={styles.quickPointText}>{point}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={styles.updateButton}
                            onPress={handleUpdateStoryPoints}
                            disabled={updatingStoryPoints}
                        >
                            {updatingStoryPoints ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.updateButtonText}>Update</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Type Picker Modal */}
            <Modal
                visible={showTypePicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowTypePicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.statusModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Change Type</Text>
                            <TouchableOpacity
                                onPress={() => setShowTypePicker(false)}
                                style={styles.modalCloseButton}
                            >
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.currentStatusContainer}>
                            <Text style={styles.currentStatusLabel}>Current Type:</Text>
                            <Text style={styles.currentFieldValue}>{issue.fields.issuetype.name}</Text>
                        </View>

                        {loadingTypes ? (
                            <View style={styles.statusLoadingContainer}>
                                <ActivityIndicator size="large" color="#0052CC" />
                            </View>
                        ) : (
                            <ScrollView style={styles.statusList}>
                                {availableTypes
                                    .filter((type) => type.name !== issue.fields.issuetype.name)
                                    .map((type) => (
                                        <TouchableOpacity
                                            key={type.id}
                                            style={styles.statusItem}
                                            onPress={() => handleUpdateType(type.id, type.name)}
                                            disabled={updatingType}
                                        >
                                            <View style={styles.statusItemContent}>
                                                <Text style={styles.statusName}>{type.name}</Text>
                                            </View>
                                            {updatingType && (
                                                <ActivityIndicator size="small" color="#0052CC" />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Priority Picker Modal */}
            <Modal
                visible={showPriorityPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowPriorityPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.statusModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Change Priority</Text>
                            <TouchableOpacity
                                onPress={() => setShowPriorityPicker(false)}
                                style={styles.modalCloseButton}
                            >
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.currentStatusContainer}>
                            <Text style={styles.currentStatusLabel}>Current Priority:</Text>
                            <View style={styles.priorityRow}>
                                <Text style={styles.priorityEmoji}>
                                    {getPriorityEmoji(issue.fields.priority?.name)}
                                </Text>
                                <Text style={styles.currentFieldValue}>{issue.fields.priority?.name || 'None'}</Text>
                            </View>
                        </View>

                        {loadingPriorities ? (
                            <View style={styles.statusLoadingContainer}>
                                <ActivityIndicator size="large" color="#0052CC" />
                            </View>
                        ) : (
                            <ScrollView style={styles.statusList}>
                                {availablePriorities
                                    .filter((priority) => priority.name !== issue.fields.priority?.name)
                                    .map((priority) => (
                                        <TouchableOpacity
                                            key={priority.id}
                                            style={styles.statusItem}
                                            onPress={() => handleUpdatePriority(priority.id, priority.name)}
                                            disabled={updatingPriorityId !== null}
                                        >
                                            <View style={styles.statusItemContent}>
                                                <Text style={styles.priorityEmoji}>
                                                    {getPriorityEmoji(priority.name)}
                                                </Text>
                                                <Text style={styles.statusName}>{priority.name}</Text>
                                            </View>
                                            {updatingPriorityId === priority.id && (
                                                <ActivityIndicator size="small" color="#0052CC" />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Sprint Picker Modal */}
            <Modal
                visible={showSprintPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowSprintPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.statusModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Change Sprint</Text>
                            <TouchableOpacity
                                onPress={() => setShowSprintPicker(false)}
                                style={styles.modalCloseButton}
                            >
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.currentStatusContainer}>
                            <Text style={styles.currentStatusLabel}>Current Sprint:</Text>
                            <Text style={styles.currentFieldValue}>
                                {(() => {
                                    const sprint = issue.fields.customfield_10020;
                                    if (!sprint || sprint === null) return 'None';
                                    if (Array.isArray(sprint)) {
                                        if (sprint.length === 0) return 'None';
                                        // Get the last sprint (most recent)
                                        const latestSprint = sprint[sprint.length - 1];
                                        if (latestSprint && latestSprint.name) {
                                            return latestSprint.name;
                                        }
                                        return 'None';
                                    }
                                    if (typeof sprint === 'object' && sprint.name) {
                                        return sprint.name;
                                    }
                                    return 'None';
                                })()}
                            </Text>
                        </View>

                        {loadingSprints ? (
                            <View style={styles.statusLoadingContainer}>
                                <ActivityIndicator size="large" color="#0052CC" />
                            </View>
                        ) : (
                            <ScrollView style={styles.statusList}>
                                {/* Active sprints first */}
                                {availableSprints
                                    .filter((sprint) => sprint.state === 'active')
                                    .map((sprint) => (
                                        <TouchableOpacity
                                            key={sprint.id}
                                            style={styles.statusItem}
                                            onPress={() => handleUpdateSprint(sprint.id, sprint.name)}
                                            disabled={updatingSprint}
                                        >
                                            <View style={styles.statusItemContent}>
                                                <Text style={styles.statusName}>🏃 {sprint.name}</Text>
                                                <Text style={styles.sprintState}>Active</Text>
                                            </View>
                                            {updatingSprint && (
                                                <ActivityIndicator size="small" color="#0052CC" />
                                            )}
                                        </TouchableOpacity>
                                    ))}

                                {/* Future sprints */}
                                {availableSprints
                                    .filter((sprint) => sprint.state === 'future')
                                    .map((sprint) => (
                                        <TouchableOpacity
                                            key={sprint.id}
                                            style={styles.statusItem}
                                            onPress={() => handleUpdateSprint(sprint.id, sprint.name)}
                                            disabled={updatingSprint}
                                        >
                                            <View style={styles.statusItemContent}>
                                                <Text style={styles.statusName}>📅 {sprint.name}</Text>
                                                <Text style={styles.sprintState}>Future</Text>
                                            </View>
                                            {updatingSprint && (
                                                <ActivityIndicator size="small" color="#0052CC" />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Status Picker Modal */}
            <Modal
                visible={showStatusPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowStatusPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.statusModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Change Status</Text>
                            <TouchableOpacity
                                onPress={() => setShowStatusPicker(false)}
                                style={styles.modalCloseButton}
                            >
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Current Status Display */}
                        <View style={styles.currentStatusContainer}>
                            <Text style={styles.currentStatusLabel}>Current Status:</Text>
                            <View style={[
                                styles.currentStatusBadge,
                                { backgroundColor: statusColor }
                            ]}>
                                <Text style={styles.currentStatusText}>{issue.fields.status.name}</Text>
                            </View>
                        </View>

                        {loadingTransitions ? (
                            <View style={styles.statusLoadingContainer}>
                                <ActivityIndicator size="large" color="#0052CC" />
                            </View>
                        ) : availableTransitions.length === 0 ? (
                            <View style={styles.statusLoadingContainer}>
                                <Text style={styles.noTransitionsText}>No status transitions available</Text>
                            </View>
                        ) : (
                            <ScrollView style={styles.statusList}>
                                {availableTransitions
                                    .filter((transition) => transition.to?.name !== issue.fields.status.name)
                                    .map((transition) => (
                                        <TouchableOpacity
                                            key={transition.id}
                                            style={styles.statusItem}
                                            onPress={() => handleTransitionIssue(transition.id, transition.name)}
                                            disabled={transitioningStatusId !== null}
                                        >
                                            <View style={styles.statusItemContent}>
                                                <View style={[
                                                    styles.statusIndicator,
                                                    { backgroundColor: getStatusColor(transition.to?.statusCategory?.key || 'default') }
                                                ]} />
                                                <View style={styles.statusInfo}>
                                                    <Text style={styles.statusName}>{transition.name}</Text>
                                                    {transition.to && (
                                                        <Text style={styles.statusDescription}>
                                                            Move to: {transition.to.name}
                                                        </Text>
                                                    )}
                                                </View>
                                            </View>
                                            {transitioningStatusId === transition.id && (
                                                <ActivityIndicator size="small" color="#0052CC" />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Assignee Picker Modal */}
            <Modal
                visible={showAssigneePicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowAssigneePicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.assigneeModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Change Assignee</Text>
                            <TouchableOpacity
                                onPress={() => setShowAssigneePicker(false)}
                                style={styles.modalCloseButton}
                            >
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search users..."
                            value={searchQuery}
                            onChangeText={handleSearchUsers}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />

                        {loadingUsers ? (
                            <View style={styles.assigneeLoadingContainer}>
                                <ActivityIndicator size="large" color="#0052CC" />
                            </View>
                        ) : (
                            <ScrollView style={styles.assigneeList}>
                                {/* Unassign option */}
                                <TouchableOpacity
                                    style={styles.assigneeItem}
                                    onPress={() => handleAssignUser(null)}
                                    disabled={assigningUser}
                                >
                                    <View style={styles.assigneeItemContent}>
                                        <View style={[styles.avatar, styles.unassignedAvatar]}>
                                            <Text style={styles.avatarText}>?</Text>
                                        </View>
                                        <View style={styles.assigneeInfo}>
                                            <Text style={styles.assigneeName}>Unassigned</Text>
                                            <Text style={styles.assigneeEmail}>Remove assignee</Text>
                                        </View>
                                    </View>
                                    {!issue?.fields.assignee && (
                                        <Text style={styles.selectedIndicator}>✓</Text>
                                    )}
                                </TouchableOpacity>

                                {assignableUsers.map((user) => {
                                    const isSelected = issue?.fields.assignee?.accountId === user.accountId;
                                    return (
                                        <TouchableOpacity
                                            key={user.accountId}
                                            style={styles.assigneeItem}
                                            onPress={() => handleAssignUser(user.accountId)}
                                            disabled={assigningUser}
                                        >
                                            <View style={styles.assigneeItemContent}>
                                                {user.avatarUrls?.['48x48'] ? (
                                                    <Image
                                                        source={{ uri: user.avatarUrls['48x48'] }}
                                                        style={styles.assigneeAvatar}
                                                    />
                                                ) : (
                                                    <View style={styles.avatar}>
                                                        <Text style={styles.avatarText}>
                                                            {user.displayName.charAt(0).toUpperCase()}
                                                        </Text>
                                                    </View>
                                                )}
                                                <View style={styles.assigneeInfo}>
                                                    <Text style={styles.assigneeName}>{user.displayName}</Text>
                                                    {user.emailAddress && (
                                                        <Text style={styles.assigneeEmail}>{user.emailAddress}</Text>
                                                    )}
                                                </View>
                                            </View>
                                            {isSelected && (
                                                <Text style={styles.selectedIndicator}>✓</Text>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* User Info Popup Modal */}
            <Modal
                visible={showUserInfoPopup}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowUserInfoPopup(false)}
            >
                <TouchableOpacity
                    style={styles.userInfoModalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowUserInfoPopup(false)}
                >
                    <View style={styles.userInfoModalContent} onStartShouldSetResponder={() => true}>
                        {selectedUserInfo && (
                            <>
                                <View style={styles.userInfoHeader}>
                                    {selectedUserInfo.avatarUrls?.['48x48'] ? (
                                        <Image
                                            source={{ uri: selectedUserInfo.avatarUrls['48x48'] }}
                                            style={styles.userInfoAvatarLarge}
                                        />
                                    ) : (
                                        <View style={styles.userInfoAvatarLarge}>
                                            <Text style={styles.userInfoAvatarText}>
                                                {selectedUserInfo.displayName.charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                    )}
                                    <TouchableOpacity
                                        style={styles.userInfoCloseButton}
                                        onPress={() => setShowUserInfoPopup(false)}
                                    >
                                        <Text style={styles.userInfoCloseText}>✕</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.userInfoBody}>
                                    <Text style={styles.userInfoLabel}>Name</Text>
                                    <Text style={styles.userInfoValue}>{selectedUserInfo.displayName}</Text>

                                    {selectedUserInfo.emailAddress && (
                                        <>
                                            <Text style={styles.userInfoLabel}>Email</Text>
                                            <Text style={styles.userInfoValue}>{selectedUserInfo.emailAddress}</Text>
                                        </>
                                    )}

                                    <Text style={styles.userInfoLabel}>Account ID</Text>
                                    <Text style={styles.userInfoValueSmall}>{selectedUserInfo.accountId}</Text>
                                </View>
                            </>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Android Date Picker */}
            {Platform.OS === 'android' && showAndroidDatePicker && (
                <DateTimePicker
                    value={selectedDueDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                        setShowAndroidDatePicker(false);
                        if (event.type === 'set' && date) {
                            setSelectedDueDate(date);
                        }
                    }}
                />
            )}

            {/* Delete Comment Confirmation Modal */}
            <Modal
                visible={deleteCommentModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setDeleteCommentModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Delete Comment</Text>
                        <Text style={styles.modalMessage}>
                            Are you sure you want to delete this comment? This action cannot be undone.
                        </Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonCancel]}
                                onPress={() => setDeleteCommentModalVisible(false)}
                            >
                                <Text style={styles.modalButtonCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonConfirm]}
                                onPress={confirmDeleteComment}
                                disabled={!!deletingCommentId}
                            >
                                <Text style={styles.modalButtonConfirmText}>
                                    {deletingCommentId ? 'Deleting...' : 'Delete'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

export default IssueDetailsScreen;
