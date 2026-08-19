import React, { useMemo, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { colors, spacing } from "../theme";

export default function SearchableSelect({ label, value, options, onChange, placeholder = "Search and select" }) {
  const { width } = useWindowDimensions();
  const phone = width < 600;
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState("");
  const selected = options.find(item => item.value === value);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter(item => `${item.label} ${item.searchText || ""}`.toLowerCase().includes(q));
  }, [options, search]);

  return <View style={styles.wrapper}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <Pressable style={styles.input} onPress={() => setVisible(true)}>
      <Text style={selected ? styles.value : styles.placeholder} numberOfLines={1}>{selected?.label || placeholder}</Text><Text style={styles.chevron}>⌄</Text>
    </Pressable>
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
      <Pressable style={[styles.backdrop, phone && styles.backdropPhone]} onPress={() => setVisible(false)}>
        <Pressable style={[styles.sheet, phone && styles.sheetPhone]} onPress={() => {}}>
          <Text style={styles.title}>{label || "Select member"}</Text>
          <TextInput autoFocus value={search} onChangeText={setSearch} placeholder="Search by name, surname, ITS ID or phone" placeholderTextColor={colors.muted} style={styles.search} />
          <ScrollView keyboardShouldPersistTaps="handled">
            {filtered.map(item => <Pressable key={item.value} style={[styles.option, item.value === value && styles.selected]} onPress={() => { onChange(item.value); setSearch(""); setVisible(false); }}><Text style={styles.optionText}>{item.label}</Text></Pressable>)}
            {!filtered.length ? <Text style={styles.empty}>No matching member found.</Text> : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  </View>;
}
const styles=StyleSheet.create({wrapper:{marginBottom:spacing.md},label:{marginBottom:spacing.xs,color:colors.text,fontWeight:"600"},input:{minHeight:48,borderWidth:1,borderColor:colors.border,borderRadius:10,backgroundColor:colors.surface,paddingHorizontal:spacing.md,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},value:{color:colors.text,flex:1,minWidth:0},placeholder:{color:colors.muted,flex:1,minWidth:0},chevron:{color:colors.muted,marginLeft:spacing.sm},backdrop:{flex:1,backgroundColor:"rgba(0,0,0,.35)",justifyContent:"center",padding:spacing.md},backdropPhone:{justifyContent:"flex-end",padding:0},sheet:{width:"100%",maxWidth:620,maxHeight:"80%",alignSelf:"center",backgroundColor:colors.surface,borderRadius:16,padding:spacing.md},sheetPhone:{maxHeight:"90%",borderTopLeftRadius:24,borderTopRightRadius:24,borderBottomLeftRadius:0,borderBottomRightRadius:0},title:{fontSize:19,fontWeight:"800",marginBottom:spacing.sm},search:{minHeight:48,borderWidth:1,borderColor:colors.border,borderRadius:10,paddingHorizontal:spacing.md,color:colors.text,marginBottom:spacing.sm,...(Platform.OS === "web" ? {outlineStyle:"none",outlineWidth:0} : {})},option:{paddingVertical:14,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:colors.border},selected:{backgroundColor:"#EAF2F0"},optionText:{color:colors.text},empty:{padding:spacing.md,color:colors.muted,textAlign:"center"}});
