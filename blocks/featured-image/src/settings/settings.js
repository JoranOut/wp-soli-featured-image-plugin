import "./settings.scss"
import {useState, useEffect} from '@wordpress/element';
import {Modal, Button, ToggleControl, Notice} from "@wordpress/components"
import apiFetch from '@wordpress/api-fetch';
import settingsSVG from "../../assets/img/settings.svg";
import ImageUploader from "../image-uploader/image-uploader";
import ImageButton from "../ImageButton/ImageButton";

function Settings({onSave}) {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setOpen] = useState(false);

    const openModal = () => {
        apiFetch({path: '/soli_featured_image/v1/all-categories'})
            .then(response => {
                setCategories(response ?? []);
                setOpen(true);
            })
            .catch(error => console.error('Error fetching categories:', error));
    };
    const closeModal = () => setOpen(false);

    const updateEnabled = (categoryId, enabled) => {
        setCategories(prev => prev.map(cat =>
            cat.category_id === categoryId ? {...cat, enabled} : cat
        ));
    };

    const updateImageId = (categoryId, imageId) => {
        setCategories(prev => prev.map(cat =>
            cat.category_id === categoryId ? {...cat, image_id: imageId ?? 0} : cat
        ));
    };

    const handleSave = () => {
        setLoading(true);
        const payload = categories.map(cat => ({
            category_id: cat.category_id,
            enabled: cat.enabled,
            image_id: cat.image_id,
        }));

        apiFetch({
            path: '/soli_featured_image/v1/category-images',
            method: 'POST',
            data: payload
        })
            .then(() => {
                setLoading(false);
                closeModal();
                onSave();
            })
            .catch(error => {
                setLoading(false);
                console.error('Error saving settings:', error);
            });
    };

    return (
        <div className="featured-image-settings">
            <ImageButton
                src={settingsSVG}
                onClick={openModal}
            />

            {isOpen && (
                <Modal
                    title="Featured Image Settings"
                    onRequestClose={closeModal}
                    focusOnMount={true}
                    isDismissible={true}
                    size={"large"}
                    shouldCloseOnEsc={true}
                    shouldCloseOnClickOutside={true}
                    __experimentalHideHeader={false}
                >
                    <div className="featured-image-settings-modal">
                        <Notice status="warning" isDismissible={false}>
                            Let op: deze instellingen gelden voor alle nieuwe berichten en pagina's met het featured image blok. Bestaande berichten blijven ongewijzigd.
                        </Notice>
                        <form>
                            {categories.map((category) => (
                                <div key={category.category_id}>
                                    <ToggleControl
                                        label={category.name}
                                        checked={category.enabled}
                                        onChange={(value) => updateEnabled(category.category_id, value)}
                                    />
                                    {category.enabled && (
                                        <ImageUploader
                                            defaultImageId={category.image_id || undefined}
                                            onChange={(media) => updateImageId(category.category_id, media?.id)}
                                        />
                                    )}
                                </div>
                            ))}
                            {categories.length === 0 && (
                                <p>Geen categorieën gevonden. Maak categorieën aan via het WordPress admin-panel.</p>
                            )}
                        </form>
                        <Button
                            type="submit"
                            className="submit-button"
                            variant="secondary"
                            onClick={() => handleSave()}>{!loading ? "Opslaan en sluiten" : "bezig"}</Button>
                    </div>
                </Modal>)}
        </div>);
}

export default Settings;
