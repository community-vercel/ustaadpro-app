import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { launchImageLibrary } from 'react-native-image-picker';
import { ArrowLeft, Camera, CheckCircle2, ChevronDown, Image as ImageIcon, X } from 'lucide-react-native';

import { RootStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';
import { useAppStore } from '@/store/useAppStore';
import { GradientButton } from '@/components/GradientButton';
import { fetchMyBookedServices, submitComplaint, BookedService } from '@/api/complaints';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Complaints'>;

export function ComplaintsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<BookedService[]>([]);
  
  // Form State
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [selectedService, setSelectedService] = useState<BookedService | null>(null);
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<any[]>([]);

  // UI State
  const [pickerVisible, setPickerVisible] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const data = await fetchMyBookedServices();
      setServices(data);
    } catch (err) {
      console.log('Failed to fetch booked services:', err);
    }
  };

  const pickImage = async () => {
    if (images.length >= 5) {
      Alert.alert('Limit Reached', 'You can only upload up to 5 images.');
      return;
    }
    
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 5 - images.length,
      quality: 0.7,
    });

    if (result.assets && result.assets.length > 0) {
      setImages(prev => [...prev, ...(result.assets || [])]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || !selectedService) {
      Alert.alert('Missing Fields', 'Please fill in your name, phone, and select a service.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('phone', phone.trim());
      formData.append('service', selectedService.service);
      if (selectedService.sub_service) {
        formData.append('subService', selectedService.sub_service);
      }
      if (description.trim()) {
        formData.append('description', description.trim());
      }

      images.forEach((img) => {
        formData.append('images', {
          uri: img.uri,
          type: img.type || 'image/jpeg',
          name: img.fileName || `complaint-${Date.now()}.jpg`,
        } as any);
      });

      await submitComplaint(formData);
      setShowSuccess(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit complaint. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#1d1e20" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>File a Complaint</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          <Text style={styles.sectionDesc}>
            We're sorry you had an issue. Please let us know the details so we can fix it.
          </Text>

          {/* Form Fields */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor={colors.muted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g. 03001234567"
              keyboardType="phone-pad"
              placeholderTextColor={colors.muted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Service</Text>
            <Pressable style={styles.selectBtn} onPress={() => setPickerVisible(true)}>
              <Text style={[styles.selectText, !selectedService && { color: colors.muted }]}>
                {selectedService 
                  ? `${selectedService.service}${selectedService.sub_service ? ` - ${selectedService.sub_service}` : ''}` 
                  : 'Choose a booked service...'}
              </Text>
              <ChevronDown color={colors.muted} size={20} />
            </Pressable>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Please explain the issue..."
              placeholderTextColor={colors.muted}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Attach Images (Up to 5)</Text>
            <View style={styles.imageRow}>
              {images.map((img, idx) => (
                <View key={idx} style={styles.imageWrap}>
                  <Image source={{ uri: img.uri }} style={styles.thumbnail} />
                  <Pressable style={styles.removeImgBtn} onPress={() => removeImage(idx)}>
                    <X color="#fff" size={14} strokeWidth={3} />
                  </Pressable>
                </View>
              ))}
              
              {images.length < 5 && (
                <Pressable style={styles.addImgBtn} onPress={pickImage}>
                  <Camera color={colors.primary} size={28} />
                </Pressable>
              )}
            </View>
          </View>

          <View style={styles.footer}>
            <GradientButton
              title={loading ? "Submitting..." : "Submit Complaint"}
              onPress={handleSubmit}
              disabled={loading}
              loading={loading}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.successOverlay}>
          <View style={styles.successContent}>
            <View style={styles.successIconWrap}>
              <CheckCircle2 color={colors.primary} size={48} strokeWidth={2} />
            </View>
            <Text style={styles.successTitle}>Complaint Submitted</Text>
            <Text style={styles.successDesc}>
              We have received your complaint and our support team will contact you shortly to resolve the issue.
            </Text>
            <GradientButton
              title="Done"
              onPress={() => {
                setShowSuccess(false);
                navigation.goBack();
              }}
              style={{ width: '100%', marginTop: 24 }}
            />
          </View>
        </View>
      </Modal>

      {/* Service Picker Modal */}
      <Modal visible={pickerVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setPickerVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select a Service</Text>
            <ScrollView style={styles.modalList}>
              {services.length === 0 ? (
                <Text style={{ padding: 20, textAlign: 'center', color: colors.muted }}>
                  No past booked services found.
                </Text>
              ) : (
                services.map((svc, idx) => (
                  <Pressable 
                    key={idx} 
                    style={styles.modalItem}
                    onPress={() => {
                      setSelectedService(svc);
                      setPickerVisible(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>
                      {svc.service} {svc.sub_service ? `(${svc.sub_service})` : ''}
                    </Text>
                    {selectedService?.service === svc.service && selectedService?.sub_service === svc.sub_service && (
                      <CheckCircle2 color={colors.primary} size={20} />
                    )}
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: fontFamily.bold, color: '#1d1e20' },
  scrollContent: { padding: 20, paddingBottom: 60 },
  sectionDesc: { fontSize: 14, color: colors.muted, marginBottom: 24, lineHeight: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontFamily: fontFamily.medium, color: '#1d1e20', marginBottom: 8 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 15,
    color: '#1d1e20',
  },
  textArea: { height: 120, paddingTop: 16 },
  selectBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: { fontSize: 15, color: '#1d1e20' },
  imageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  imageWrap: { width: 72, height: 72, borderRadius: 12, overflow: 'hidden' },
  thumbnail: { width: '100%', height: '100%' },
  removeImgBtn: {
    position: 'absolute', top: 4, right: 4, width: 22, height: 22,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  addImgBtn: {
    width: 72, height: 72, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed',
    borderColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#eff9f3',
  },
  footer: { marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 30, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontFamily: fontFamily.bold, color: '#1d1e20', padding: 20, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: colors.border },
  modalList: { paddingHorizontal: 20 },
  modalItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalItemText: { fontSize: 16, color: '#1d1e20' },
  successOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 24 },
  successContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  successIconWrap: {
    width: 80, height: 80,
    borderRadius: 40,
    backgroundColor: '#effcf6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontFamily: fontFamily.bold,
    color: '#1d1e20',
    marginBottom: 12,
    textAlign: 'center',
  },
  successDesc: {
    fontSize: 15,
    fontFamily: fontFamily.regular,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
