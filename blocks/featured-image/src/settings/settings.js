import "./settings.scss"
import {useState, useEffect} from '@wordpress/element';
import {Modal, Button, TextControl} from "@wordpress/components"
import apiFetch from '@wordpress/api-fetch';
import settingsSVG from "../../assets/img/settings.svg";
import addCircleSVG from "../../assets/img/add_circle.svg";
import ImageUploader from "../image-uploader/image-uploader";

function Settings({options, onChange}) {
    const [settings, setSettings] = useState(options ?? []);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [isOpen, setOpen] = useState(false);

    const openModal = () => {
        setOpen(true);
    }
    const closeModal = () => setOpen(false);

    const updateSettings = (label, value) => {
        const newSettings = [...settings]
        newSettings
            .filter(setting => setting.label === label)
            .map(setting => setting.value = value ?? '');
        setSettings(newSettings);
    }

    const handleSave = () => {
        apiFetch({
            path: '/soli_featured_image/v1/update',
            method: 'POST',
            data: settings
        })
            .then(data => {
                closeModal();
                onChange(data);
            })
            .catch(error => {
                setError('Error saving options');
            });
    };

    const handleLabelChange = (index, value) => {
        const newSettings = [...settings]
        newSettings[index]['label'] = value;
        setSettings(newSettings);
    };

    const addNewSetting = () => {
        const newSettings = [...settings]
        newSettings.push({label: '', value: ''})
        setSettings(newSettings);
    }

    const removeSetting = (index) => {
        const newSettings = [...settings]
        newSettings.splice(index, 1)
        setSettings(newSettings);
    }

    useEffect(() => {
        setSettings(settings)
    }, [settings])

    useEffect(() => {
        setSettings(options)
    }, [options])

    return (
        <div className="featured-image-settings">
            <img
                className={"edit-icon"}
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
                        <form>
                            {
                                settings && settings.map((setting, index) => {
                                    return (
                                        <div key={index}>
                                            <TextControl
                                                value={settings[index].label}
                                                onChange={(value) => handleLabelChange(index, value)}
                                            />
                                            <ImageUploader
                                                defaultImageId={setting.value}
                                                onChange={(media) => updateSettings(setting.label, media?.id)}/>
                                            {!setting?.value && <Button onClick={() => removeSetting(index)} isDestructive>
                                                Remove group
                                            </Button>}
                                        </div>
                                    );
                                })
                            }
                            <div className='new'
                                 onClick={() => addNewSetting()}
                            >
                                <img
                                    className={"new-icon"}
                                    src={addCircleSVG}
                                />
                            </div>
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
