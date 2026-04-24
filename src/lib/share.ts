export const shareItem = async (title: string, text: string, url: string = window.location.href) => {
  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url,
      });
    } catch (err) {
      console.error("Error sharing:", err);
    }
  } else {
    try {
      await navigator.clipboard.writeText(`${title}\n${text}\n${url}`);
      alert("Link copiado para a área de transferência!");
    } catch (err) {
      console.error("Failed to copy:", err);
      alert("Erro ao copiar o link.");
    }
  }
};
